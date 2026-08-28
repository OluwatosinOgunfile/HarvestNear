import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/security";
import { createGoogleAuthorization, GOOGLE_OAUTH_MOBILE_COOKIE, GOOGLE_OAUTH_RETURN_COOKIE, GOOGLE_OAUTH_STATE_COOKIE, GOOGLE_OAUTH_VERIFIER_COOKIE, googleAuthConfigured, validReturnPath } from "@/lib/google-auth";

export async function GET(request: Request) {
  if (!googleAuthConfigured()) return NextResponse.redirect(new URL("/?authError=google_not_configured", request.url));
  if (!await checkRateLimit(request, "auth.google.start", 20, 15 * 60)) return NextResponse.redirect(new URL("/?authError=too_many_attempts", request.url));

  const { state, verifier, authorizationUrl } = createGoogleAuthorization(request);
  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 10 * 60 };
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, validReturnPath(new URL(request.url).searchParams.get("returnTo")), cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_MOBILE_COOKIE, new URL(request.url).searchParams.get("mobile") === "1" ? "1" : "0", cookieOptions);
  return response;
}
