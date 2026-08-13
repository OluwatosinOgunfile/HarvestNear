export const FARMER_ARRANGED_DELIVERY_FEE_KOBO = 0;

export function doorstepDeliveryFeeKobo(distanceKm: number) {
  const safeDistance = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  return Math.round((800 + safeDistance * 150) * 100);
}
