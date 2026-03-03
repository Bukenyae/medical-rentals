export interface AttendeePricingTier {
  minAttendees: number;
  maxAttendees: number;
  extraHourlyCents: number;
}

export const DEFAULT_ATTENDEE_PRICING_TIERS: AttendeePricingTier[] = [
  { minAttendees: 1, maxAttendees: 9, extraHourlyCents: 0 },
  { minAttendees: 10, maxAttendees: 15, extraHourlyCents: 2500 },
  { minAttendees: 16, maxAttendees: 20, extraHourlyCents: 4500 },
  { minAttendees: 21, maxAttendees: 25, extraHourlyCents: 6500 },
  { minAttendees: 26, maxAttendees: 30, extraHourlyCents: 8500 },
  { minAttendees: 31, maxAttendees: 35, extraHourlyCents: 9500 },
  { minAttendees: 36, maxAttendees: 40, extraHourlyCents: 11500 },
  { minAttendees: 41, maxAttendees: 45, extraHourlyCents: 13500 },
  { minAttendees: 46, maxAttendees: 50, extraHourlyCents: 15500 },
];

function toPositiveInt(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

function toCents(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export function normalizeAttendeePricingTiers(
  rawTiers: unknown,
  maxEventGuests: number
): AttendeePricingTier[] {
  const safeMaxGuests = Math.max(1, Math.floor(maxEventGuests));

  const normalizedFromRaw = Array.isArray(rawTiers)
    ? rawTiers
        .map((tier) => {
          const row = typeof tier === 'object' && tier !== null
            ? (tier as Record<string, unknown>)
            : null;
          if (!row) return null;

          const minAttendees = toPositiveInt(row.minAttendees, NaN);
          const maxAttendees = toPositiveInt(row.maxAttendees, NaN);
          const extraHourlyCents = toCents(row.extraHourlyCents, 0);

          if (!Number.isFinite(minAttendees) || !Number.isFinite(maxAttendees)) {
            return null;
          }

          return {
            minAttendees,
            maxAttendees,
            extraHourlyCents,
          } as AttendeePricingTier;
        })
        .filter((tier): tier is AttendeePricingTier => Boolean(tier))
    : [];

  const source = normalizedFromRaw.length > 0
    ? normalizedFromRaw
    : DEFAULT_ATTENDEE_PRICING_TIERS;

  const sorted = source
    .map((tier) => ({
      minAttendees: Math.max(1, Math.floor(tier.minAttendees)),
      maxAttendees: Math.max(1, Math.floor(tier.maxAttendees)),
      extraHourlyCents: Math.max(0, Math.round(tier.extraHourlyCents)),
    }))
    .sort((a, b) => a.minAttendees - b.minAttendees);

  const clamped: AttendeePricingTier[] = [];
  let nextMin = 1;

  for (const tier of sorted) {
    if (nextMin > safeMaxGuests) break;

    const maxAttendees = Math.min(safeMaxGuests, Math.max(nextMin, tier.maxAttendees));

    clamped.push({
      minAttendees: nextMin,
      maxAttendees,
      extraHourlyCents: tier.extraHourlyCents,
    });

    nextMin = maxAttendees + 1;
  }

  if (clamped.length === 0) {
    return [{ minAttendees: 1, maxAttendees: safeMaxGuests, extraHourlyCents: 0 }];
  }

  const last = clamped[clamped.length - 1];
  if (last.maxAttendees < safeMaxGuests) {
    clamped.push({
      minAttendees: last.maxAttendees + 1,
      maxAttendees: safeMaxGuests,
      extraHourlyCents: last.extraHourlyCents,
    });
  }

  return clamped;
}

export function findAttendeeTier(
  tiers: AttendeePricingTier[],
  guestCount: number
): AttendeePricingTier {
  const safeGuestCount = Math.max(1, Math.floor(guestCount));
  const match = tiers.find(
    (tier) => safeGuestCount >= tier.minAttendees && safeGuestCount <= tier.maxAttendees
  );

  if (match) return match;
  return tiers[tiers.length - 1];
}
