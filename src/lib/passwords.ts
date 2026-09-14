import "server-only";

import { createHash } from "node:crypto";

const RANGE_URL = "https://api.pwnedpasswords.com/range/";
// A sign-up must not hang on someone else's service, so the check is given a short window.
const LOOKUP_TIMEOUT_MS = 2500;

/**
 * How many times a password appears in public breach corpora, or null when that cannot be
 * determined. Length rules stop nothing on their own: "Password123" satisfies every one of them and
 * is among the most common passwords in existence. What actually matters is whether the password is
 * already on a list an attacker is spraying.
 *
 * Only the first five characters of the SHA-1 are sent, and the full list of matching suffixes comes
 * back to be compared here, so neither the password nor its complete hash ever leaves this server.
 * SHA-1 is the protocol's requirement for that lookup and is not how passwords are stored; those are
 * bcrypt. Add-Padding stops the size of the response hinting at the answer.
 *
 * Returning null on any failure is deliberate. A breach service that is slow, rate limited, or down
 * must never be the reason somebody cannot open an account.
 */
export async function breachedPasswordCount(password: string): Promise<number | null> {
  if (!password) return null;
  const digest = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(`${RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "HarvestNearU-Marketplace" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = await response.text();
    for (const line of body.split("\n")) {
      const [candidate, occurrences] = line.trim().split(":");
      // Padded entries come back with a count of zero and are not real matches.
      if (candidate === suffix) return Number(occurrences) || 0;
    }
    return 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const BREACHED_PASSWORD_MESSAGE = "This password has appeared in a public data breach, so it is already on the lists attackers try first. Please choose a different one.";

/** True only when the password is known to be breached; an unavailable service never blocks. */
export async function passwordIsBreached(password: string) {
  const occurrences = await breachedPasswordCount(password);
  return typeof occurrences === "number" && occurrences > 0;
}
