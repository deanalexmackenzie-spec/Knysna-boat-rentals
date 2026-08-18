export const DEFAULT_DEPOSIT_PERCENT = 50;

export interface Quote {
  dayRate: number;
  skipperRate: number;
  total: number;
  deposit: number;
  balance: number;
}

/**
 * Deposit = depositPercent% of (day rate + skipper fee if selected).
 * Balance is the remainder, so the two always sum exactly to the total
 * regardless of rounding.
 */
export function quote(
  dayRate: number,
  skipperRate: number,
  skipper: boolean,
  depositPercent: number = DEFAULT_DEPOSIT_PERCENT,
): Quote {
  const skipperFee = skipper ? Number(skipperRate) || 0 : 0;
  const total = round2(Number(dayRate) + skipperFee);
  const deposit = round2((total * depositPercent) / 100);
  return {
    dayRate: round2(Number(dayRate)),
    skipperRate: skipperFee,
    total,
    deposit,
    balance: round2(total - deposit),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** R 4 600 — ZAR, no decimals when the amount is whole. */
export function formatZar(amount: number | string): string {
  const n = Number(amount) || 0;
  const whole = Math.abs(n % 1) < 0.005;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
}

/** Plain "4600.00" for gateway payloads. */
export function amountForGateway(amount: number | string): string {
  return (Number(amount) || 0).toFixed(2);
}
