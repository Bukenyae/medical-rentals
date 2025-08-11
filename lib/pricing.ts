export interface PricingInput {
  pricePerNight: number;
  nights: number;
  guests: number;
  cleaningRateWeekly?: number; // fallback derived from nights
  cleaningRateMonthly?: number; // fallback derived from nights
  serviceFeeRate?: number; // default 0.14
  taxRate?: number; // default 0.13
  discountWeekly?: number; // default 0.20
  discountMonthly?: number; // default 0.40
  discountFlat?: number; // optional additional flat discount
}

export interface PricingBreakdown {
  base: number;
  discountRate: number; // applied rate 0..1
  discountAmount: number;
  effectiveNightly: number;
  subtotalBeforeFees: number; // base - discount
  cleaningRate: number;
  cleaningFee: number;
  serviceFee: number;
  tax: number;
  subtotal: number; // subtotalBeforeFees + fees (ex tax)
  total: number; // subtotal + tax
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const {
    pricePerNight,
    nights,
    guests,
    serviceFeeRate = 0.14,
    taxRate = 0.13,
    discountWeekly = 0.20,
    discountMonthly = 0.40,
    discountFlat = 0,
  } = input;

  const base = Math.round(pricePerNight * nights * Math.max(guests, 1));

  const discountRate = nights >= 21 ? discountMonthly : nights >= 7 ? discountWeekly : 0;
  const discountAmount = Math.round(base * discountRate) + Math.round(discountFlat || 0);
  const subtotalBeforeFees = base - discountAmount;

  const cleaningRate = nights > 21 ? 0.07 : nights >= 8 ? 0.15 : 0.30;
  const cleaningFee = Math.round(subtotalBeforeFees * cleaningRate);
  const serviceFee = Math.round(subtotalBeforeFees * serviceFeeRate);
  const tax = Math.round(subtotalBeforeFees * taxRate);

  const subtotal = subtotalBeforeFees + cleaningFee + serviceFee;
  const total = subtotal + tax;
  const effectiveNightly = Math.round(pricePerNight * (1 - discountRate));

  return {
    base,
    discountRate,
    discountAmount,
    effectiveNightly,
    subtotalBeforeFees,
    cleaningRate,
    cleaningFee,
    serviceFee,
    tax,
    subtotal,
    total,
  };
}

export function toCurrency(value: number, currency = 'USD', locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
