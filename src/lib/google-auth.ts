import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "harvestnearu_google_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "harvestnearu_google_verifier";
export const GOOGLE_OAUTH_RETURN_COOKIE = "harvestnearu_google_return";
export const GOOGLE_OAUTH_MOBILE_COOKIE = "harvestnearu_google_mobile";

export function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createGoogleAuthorization(request: Request) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callbackUrl = new URL("/api/auth/google/callback", new URL(request.url).origin).toString();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return { state, verifier, callbackUrl, authorizationUrl: url };
}

export function validReturnPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
