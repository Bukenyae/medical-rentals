export type BookingKind = 'stay' | 'event';
export type BookingMode = 'request' | 'instant';

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'awaiting_payment'
  | 'paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'deposit_released';

export type EventType =
  | 'corporate'
  | 'private_celebration'
  | 'intimate_wedding'
  | 'production'
  | 'other';

export interface StayQuoteInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nightlyRateCents: number;
  cleaningFeeCents?: number;
  addonsTotalCents?: number;
}

export interface EventQuoteInput {
  propertyId: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  guestCount: number;
  estimatedVehicles?: number;
  hourlyRateCents: number;
  minHours?: number;
  dayRateCents?: number | null;
  dayRateHours?: number;
  cleaningFeeCents?: number;
  depositCents?: number;
  addonsTotalCents?: number;
  allowInstantBook?: boolean;
  curfewTime?: string | null;
  alcohol?: boolean;
  amplifiedSound?: boolean;
}

export interface QuoteResult {
  mode: BookingMode;
  currency: 'usd';
  subtotalCents: number;
  feesCents: number;
  addonsTotalCents: number;
  depositCents: number;
  totalCents: number;
  durationHours?: number;
  pricingSnapshot: Record<string, unknown>;
  riskFlags: string[];
}

export interface BookingDraftInput {
  propertyId: string;
  kind: BookingKind;
  guestCount: number;
  startAt: string;
  endAt: string;
  mode: BookingMode;
  quote: QuoteResult;
  eventDetails?: Record<string, unknown>;
  stayDetails?: Record<string, unknown>;
}
