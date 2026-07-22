import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { createSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { checkRateLimit, validText } from "@/lib/security";

type SignupBody = { firstName?: string; lastName?: string; phone?: string; email?: string; password?: string; role?: string; farmName?: string; farmLocation?: string; latitude?: string; longitude?: string };

export async function POST(request: Request) {
  if (!await checkRateLimit(request, "auth.signup", 5, 60 * 60)) return NextResponse.json({ error: "Too many account creation attempts. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as SignupBody | null;
  const role = body?.role === "farmer" ? "farmer" : body?.role === "consumer" ? "consumer" : null;
  const email = body?.email?.trim().toLowerCase();
  const phone = body?.phone?.trim();
  if (!body?.firstName?.trim() || !body.lastName?.trim() || !email || !phone || !body.password || !role) {
    return NextResponse.json({ error: "Complete all required account fields" }, { status: 400 });
  }
  if (!validText(body.firstName, 80) || !validText(body.lastName, 80) || !validText(email, 254) || !validText(phone, 30)) return NextResponse.json({ error: "One or more account fields are too long" }, { status: 400 });
  if (body.password.length < 8 || body.password.length > 128) return NextResponse.json({ error: "Password must contain between 8 and 128 characters" }, { status: 400 });
  if (role === "farmer" && (!body.farmName?.trim() || !body.farmLocation?.trim())) {
    return NextResponse.json({ error: "Farm name and location are required for farmer accounts" }, { status: 400 });
  }
  if (role === "farmer" && (!validText(body.farmName, 140) || !validText(body.farmLocation, 300))) return NextResponse.json({ error: "Farm details are too long" }, { status: 400 });
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (role === "farmer" && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return NextResponse.json({ error: "Capture or enter valid farm coordinates" }, { status: 400 });
  }

  try {
    const sql = getDatabase();
    let user;
    let farmId: string | null = null;
    if (role === "farmer") {
      const locationParts = body.farmLocation!.split(",").map((part) => part.trim()).filter(Boolean);
      const city = locationParts[0] || "Abuja";
      const state = locationParts.at(-1) || "FCT";
      const farmSlug = `${body.farmName!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomUUID().slice(0, 8)}`;
      [user] = await sql`
        WITH new_user AS (
          INSERT INTO users (email, phone, first_name, last_name, role, password_hash)
          VALUES (${email}, ${phone}, ${body.firstName.trim()}, ${body.lastName.trim()}, 'farmer', crypt(${body.password}, gen_salt('bf', 12)))
          RETURNING id, email, first_name, last_name, role
        ), new_farm AS (
          INSERT INTO farms (owner_id, name, slug, description, phone, email, address_text, city, state, latitude, longitude, verification_status, offers_pickup)
          SELECT id, ${body.farmName!.trim()}, ${farmSlug}, 'New farm awaiting profile completion and verification.', ${phone}, ${email}, ${body.farmLocation!.trim()}, ${city}, ${state}, ${latitude}, ${longitude}, 'pending', true
          FROM new_user RETURNING id
        )
        SELECT new_user.*, new_farm.id AS farm_id FROM new_user CROSS JOIN new_farm
      `;
      farmId = String(user.farm_id);
    } else {
      [user] = await sql`
        WITH new_user AS (
          INSERT INTO users (email, phone, first_name, last_name, role, password_hash)
          VALUES (${email}, ${phone}, ${body.firstName.trim()}, ${body.lastName.trim()}, 'consumer', crypt(${body.password}, gen_salt('bf', 12)))
          RETURNING id, email, first_name, last_name, role
        ), new_profile AS (
          INSERT INTO consumer_profiles (user_id) SELECT id FROM new_user
        )
        SELECT * FROM new_user
      `;
    }
    await createSession(String(user.id));
    return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role }, farmId }, { status: 201 });
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") return NextResponse.json({ error: "An account already uses that email or phone number" }, { status: 409 });
    console.error("Account creation failed", error);
    return NextResponse.json({ error: "Could not create the account" }, { status: 500 });
  }
}
