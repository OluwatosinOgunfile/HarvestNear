import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { checkRateLimit, validText } from "@/lib/security";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; source?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!validText(email, 254, 5) || !EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (!await checkRateLimit(request, "newsletter.subscribe", 8, 60 * 60, email)) return NextResponse.json({ error: "Too many subscription attempts. Try again later." }, { status: 429 });

  const source = body?.source === "farm_store_footer" ? "farm_store_footer" : "website_footer";
  const sql = getDatabase();
  await sql`
    INSERT INTO campaign_subscribers (user_id, email, source, is_active, consented_at)
    VALUES ((SELECT id FROM users WHERE lower(email) = ${email} LIMIT 1), ${email}, ${source}, true, now())
    ON CONFLICT (lower(email)) DO UPDATE SET
      user_id = coalesce(campaign_subscribers.user_id, excluded.user_id),
      source = excluded.source,
      is_active = true,
      consented_at = CASE WHEN campaign_subscribers.is_active THEN campaign_subscribers.consented_at ELSE now() END,
      unsubscribed_at = NULL,
      updated_at = now()
  `;
  return NextResponse.json({ message: "You are subscribed to Harvest notes." }, { status: 201 });
}
