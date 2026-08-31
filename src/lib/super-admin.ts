import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const DEFAULT_SUPER_ADMIN_EMAIL = "admin@harvestnearu.com";

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL).trim().toLowerCase();
}

export function isSuperAdminEmail(email: unknown) {
  return String(email || "").trim().toLowerCase() === getSuperAdminEmail();
}

export function isSuperAdminAccount(user: { email?: unknown; role?: unknown } | null | undefined) {
  return user?.role === "admin" && isSuperAdminEmail(user.email);
}

export function verifySuperAdminPassword(password: unknown) {
  const configured = process.env.SUPER_ADMIN_PASSWORD || "";
  if (configured.length < 16 || typeof password !== "string") return false;
  const suppliedHash = createHash("sha256").update(password).digest();
  const configuredHash = createHash("sha256").update(configured).digest();
  return timingSafeEqual(suppliedHash, configuredHash);
}

export function superAdminCredentialVersion() {
  const configured = process.env.SUPER_ADMIN_PASSWORD || "";
  return configured.length >= 16 ? createHash("sha256").update(configured).digest("hex") : null;
}
