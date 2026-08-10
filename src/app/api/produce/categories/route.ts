import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { canMutateAs, checkRateLimit, validText } from "@/lib/security";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["farmer", "admin"].includes(user.role) || !canMutateAs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await checkRateLimit(request, "produce.category.create", 20, 60 * 60, user.id)) return NextResponse.json({ error: "Category creation limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { name?: string; description?: string } | null;
  const name = body?.name?.trim().replace(/\s+/g, " ") || "";
  const description = body?.description?.trim().replace(/\s+/g, " ") || null;
  if (!validText(name, 60, 2) || (description && !validText(description, 240))) return NextResponse.json({ error: "Enter a category name between 2 and 60 characters." }, { status: 400 });
  const slug = slugify(name);
  if (!slug) return NextResponse.json({ error: "Enter a valid category name." }, { status: 400 });
  const sql = getDatabase();
  const [existing] = await sql`SELECT id,name FROM produce_categories WHERE slug=${slug} LIMIT 1`;
  if (existing) {
    if (!(await sql`SELECT is_active FROM produce_categories WHERE id=${existing.id}`)[0]?.is_active) return NextResponse.json({ error: "This category is currently unavailable. Contact support." }, { status: 409 });
    return NextResponse.json({ category: existing, existing: true });
  }
  try {
    const [category] = await sql`INSERT INTO produce_categories (name,slug,description) VALUES (${name},${slug},${description}) RETURNING id,name`;
    await sql`INSERT INTO audit_logs (actor_id,action,entity_type,entity_id,after_data) VALUES (${user.id},'produce_category.created','produce_category',${category.id},${JSON.stringify({ name, slug })}::jsonb)`;
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") {
      const [category] = await sql`SELECT id,name FROM produce_categories WHERE slug=${slug} AND is_active LIMIT 1`;
      if (category) return NextResponse.json({ category, existing: true });
    }
    console.error("Could not create produce category", error);
    return NextResponse.json({ error: "Could not create category." }, { status: 500 });
  }
}
