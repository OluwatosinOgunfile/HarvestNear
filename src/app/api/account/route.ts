import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

import { deleteSession, getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";
import { canMutateAs, checkRateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const OPTIONS = mobileOptions;

export async function DELETE(request: Request) {
  const headers = mobileCorsHeaders(request);
  const session = await getSessionUser();
  if (!session || !canMutateAs(session)) return NextResponse.json({ error: "Sign in to delete your account" }, { status: 401, headers });
  if (["admin", "support"].includes(session.role)) return NextResponse.json({ error: "Administrator and support accounts must be removed by another administrator" }, { status: 403, headers });
  if (!await checkRateLimit(request, "account.delete", 3, 60 * 60, session.id)) return NextResponse.json({ error: "Too many deletion attempts. Try again later." }, { status: 429, headers });

  const body = await request.json().catch(() => null) as { confirmation?: string; password?: string } | null;
  if (body?.confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm permanent account deletion" }, { status: 400, headers });

  const sql = getDatabase();
  const [account] = await sql`SELECT password_hash, avatar_url FROM users WHERE id = ${session.id} AND is_active`;
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404, headers });
  if (account.password_hash) {
    const [verified] = await sql`SELECT crypt(${body.password || ""}, ${account.password_hash}) = ${account.password_hash} AS valid`;
    if (!verified?.valid) return NextResponse.json({ error: "Enter your current password to delete this account" }, { status: 401, headers });
  }

  const tombstoneEmail = `deleted-${session.id}@deleted.harvestnearu.invalid`;
  try {
    await sql.transaction([
      sql`UPDATE produce_listings SET status = 'paused', updated_at = now() WHERE farm_id IN (SELECT id FROM farms WHERE owner_id = ${session.id}) AND status IN ('draft','active')`,
      sql`UPDATE farms SET verification_status = 'suspended', phone = 'Unavailable', email = NULL, address_text = 'Location removed', latitude = 0, longitude = 0, offers_pickup = false, offers_delivery = false, updated_at = now() WHERE owner_id = ${session.id}`,
      sql`DELETE FROM support_tickets WHERE requester_id = ${session.id}`,
      sql`DELETE FROM support_ticket_messages WHERE author_id = ${session.id}`,
      sql`UPDATE support_tickets SET assigned_to = NULL, updated_at = now() WHERE assigned_to = ${session.id}`,
      sql`UPDATE farms SET average_rating = coalesce((SELECT round(avg(rating)::numeric, 2) FROM reviews WHERE farm_id = farms.id AND is_visible AND customer_id <> ${session.id}), 0), review_count = (SELECT count(*)::int FROM reviews WHERE farm_id = farms.id AND is_visible AND customer_id <> ${session.id}), updated_at = now() WHERE id IN (SELECT farm_id FROM reviews WHERE customer_id = ${session.id})`,
      sql`DELETE FROM reviews WHERE customer_id = ${session.id}`,
      sql`DELETE FROM addresses WHERE user_id = ${session.id}`,
      sql`DELETE FROM favourites WHERE user_id = ${session.id}`,
      sql`DELETE FROM carts WHERE user_id = ${session.id}`,
      sql`DELETE FROM notifications WHERE user_id = ${session.id}`,
      sql`DELETE FROM mobile_push_tokens WHERE user_id = ${session.id}`,
      sql`DELETE FROM mobile_web_handoffs WHERE user_id = ${session.id}`,
      sql`DELETE FROM password_reset_codes WHERE user_id = ${session.id}`,
      sql`DELETE FROM email_verification_codes WHERE user_id = ${session.id}`,
      sql`DELETE FROM oauth_accounts WHERE user_id = ${session.id}`,
      sql`DELETE FROM user_email_preferences WHERE user_id = ${session.id}`,
      sql`DELETE FROM consumer_profiles WHERE user_id = ${session.id}`,
      sql`UPDATE audit_logs SET before_data = NULL, after_data = NULL WHERE entity_type = 'user' AND entity_id = ${session.id}`,
      sql`UPDATE users SET email = ${tombstoneEmail}, phone = NULL, password_hash = NULL, first_name = 'Deleted', last_name = 'User', avatar_url = NULL, email_verified_at = NULL, phone_verified_at = NULL, is_active = false, deleted_at = now(), updated_at = now() WHERE id = ${session.id}`,
      sql`DELETE FROM user_sessions WHERE user_id = ${session.id} OR impersonator_user_id = ${session.id}`,
    ]);
  } catch (error) {
    console.error("Account deletion failed", error);
    return NextResponse.json({ error: "Account deletion could not be completed. Please contact support." }, { status: 500, headers });
  }

  if (account.avatar_url && String(account.avatar_url).includes(".blob.vercel-storage.com")) {
    await del(String(account.avatar_url)).catch((error) => console.error("Deleted account avatar cleanup failed", error));
  }
  await deleteSession();
  return NextResponse.json({ deleted: true }, { headers });
}
