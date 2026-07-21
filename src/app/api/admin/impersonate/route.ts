import { NextRequest, NextResponse } from "next/server";

import { getSessionUser, startImpersonation, stopImpersonation } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { userId?: string } | null;
  const userId = String(body?.userId || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: "Select a valid user" }, { status: 400 });
  const target = await startImpersonation(userId);
  if (!target) return NextResponse.json({ error: "Impersonation is unavailable for this session or user" }, { status: 403 });
  const user = await getSessionUser();
  if (!user?.impersonating) return NextResponse.json({ error: "The impersonated session could not be resolved" }, { status: 500 });
  return NextResponse.json({ impersonating: true, user });
}

export async function DELETE() {
  const result = await stopImpersonation();
  if (!result) return NextResponse.json({ error: "No active impersonation session" }, { status: 409 });
  return NextResponse.json({ impersonating: false });
}
