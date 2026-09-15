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
