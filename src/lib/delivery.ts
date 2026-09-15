export const FARMER_ARRANGED_DELIVERY_FEE_KOBO = 0;

/** Doorstep delivery is billed at ₦250 for every kilometre to the farthest supplying farm. */
export const DOORSTEP_RATE_PER_KM_KOBO = 250 * 100;

/**
 * A trip under a kilometre still costs a whole one. The rider makes the same journey whether the
 * farm is 300 m or 1 km away, so ₦250 is the floor rather than a proportional share of it.
 */
export const DOORSTEP_MINIMUM_FEE_KOBO = DOORSTEP_RATE_PER_KM_KOBO;

export function doorstepDeliveryFeeKobo(distanceKm: number) {
  // A missing or nonsensical distance falls back to the floor, never to free delivery.
  const billableKm = Math.max(1, Number.isFinite(distanceKm) ? distanceKm : 1);
  // Rounded to whole naira: a fee of ₦632.50 is not something anyone hands over at the gate.
  return Math.round(billableKm * DOORSTEP_RATE_PER_KM_KOBO / 100) * 100;
}

/**
 * Farms set their own delivery radius and customers their own preferred distance, so this is not a
 * policy limit: it is the widest value a `numeric(6,2)` radius column can hold. Anything larger makes
 * Postgres raise a numeric field overflow, which reaches the person saving as an unexplained failure.
 */
export const RADIUS_MAX_KM = 9999.99;

/**
 * Reads a radius someone typed. `Number("abc")` is NaN, and Postgres `numeric` *accepts* NaN as a
 * value rather than rejecting it — both radius columns' CHECK constraints pass as well, because
 * Postgres sorts NaN above every number. An unchecked typo was therefore stored, and since NaN is
 * falsy in JavaScript and never compares true, it silently switched a farm's doorstep delivery off
 * and flattened a customer's proximity ranking.
 */
function parseRadiusKm(raw: unknown, whenBlankKm: number, minimumKm: number, tooSmall: string): { km: number } | { error: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { km: whenBlankKm };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: "Enter the distance in kilometres, for example 20." };
  if (value < minimumKm) return { error: tooSmall };
  if (value > RADIUS_MAX_KM) return { error: `The distance cannot be more than ${RADIUS_MAX_KM} km.` };
  // The columns keep two decimal places, so round here rather than letting Postgres do it silently.
  return { km: Math.round(value * 100) / 100 };
}

export const parseDeliveryRadiusKm = (raw: unknown) =>
  parseRadiusKm(raw, 0, 0, "The delivery radius cannot be negative. Use 0 to stop offering doorstep delivery.");

export const parsePreferredRadiusKm = (raw: unknown) =>
  parseRadiusKm(raw, 20, 1, "Your preferred distance must be at least 1 km.");
