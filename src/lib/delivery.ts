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
/**
 * Nearby-harvest notifications are never sent further than this, whatever radius a shopper asks for,
 * because `notifyNearbyProduce` takes the lesser of the two. It lived inline in that query, which
 * meant the forms could accept 40 km and quietly deliver 25. One definition, read by the query, the
 * parser that refuses larger values, and the profile response the forms set their own limit from.
 */
export function nearbyProduceMaxDistanceKm() {
  const configured = Number(process.env.NEARBY_PRODUCE_MAX_DISTANCE_KM || 25);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1), 100) : 25;
}

function parseRadiusKm(raw: unknown, whenBlankKm: number, minimumKm: number, maximumKm: number, tooSmall: string): { km: number } | { error: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { km: whenBlankKm };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: "Enter the distance in kilometres, for example 20." };
  if (value < minimumKm) return { error: tooSmall };
  if (value > maximumKm) return { error: `The distance cannot be more than ${maximumKm} km.` };
  // The columns keep two decimal places, so round here rather than letting Postgres do it silently.
  return { km: Math.round(value * 100) / 100 };
}

export const parseDeliveryRadiusKm = (raw: unknown) =>
  parseRadiusKm(raw, 0, 0, RADIUS_MAX_KM, "The delivery radius cannot be negative. Use 0 to stop offering doorstep delivery.");

// Capped at the distance notifications actually reach: a larger number would change nothing and read
// as though it had.
export const parsePreferredRadiusKm = (raw: unknown) =>
  parseRadiusKm(raw, 20, 1, nearbyProduceMaxDistanceKm(), "Your notification radius must be at least 1 km.");
