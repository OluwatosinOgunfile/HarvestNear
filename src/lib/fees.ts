import "server-only";

/**
 * The administration and processing fee taken from each farm's share of an order. It is quoted to
 * farmers wherever they set a price, so it lives in one place: changing PLATFORM_FEE_RATE updates
 * the charge and every notice that quotes it together, and they cannot drift apart.
 */
const CONFIGURED_RATE = Number(process.env.PLATFORM_FEE_RATE ?? 0.1);
export const PLATFORM_FEE_RATE = Number.isFinite(CONFIGURED_RATE) ? Math.min(Math.max(CONFIGURED_RATE, 0), 0.5) : 0.1;

export function platformFeeKobo(subtotalKobo: number) {
  return Math.round(Math.max(0, subtotalKobo) * PLATFORM_FEE_RATE);
}

/** Taken as the remainder so the fee and the payout always add back to the sale exactly. */
export function farmerNetKobo(subtotalKobo: number) {
  return Math.max(0, subtotalKobo) - platformFeeKobo(subtotalKobo);
}

export function platformFeePolicy() {
  const percent = PLATFORM_FEE_RATE * 100;
  return {
    rate: PLATFORM_FEE_RATE,
    percent,
    label: `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/\.?0+$/, "")}%`,
  };
}
