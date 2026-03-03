import { User } from '@supabase/supabase-js';

export type BookingRail = 'stay' | 'event';

export interface AttendeePricingTier {
  minAttendees: number;
  maxAttendees: number;
  extraHourlyCents: number;
}

export type EventQuote = {
  mode: 'request' | 'instant';
  subtotalCents: number;
  feesCents: number;
  addonsTotalCents: number;
  totalCents: number;
  depositCents: number;
  durationHours?: number;
  pricingSnapshot?: {
    productionSubtotalCents?: number;
    multiDayDiscountPct?: number;
    multiDayDiscountCents?: number;
    overnightHold?: boolean;
    overnightHoldingPct?: number;
    overnightNights?: number;
    overnightHoldingCents?: number;
    attendeeTier?: {
      minAttendees: number;
      maxAttendees: number;
      extraHourlyCents: number;
      label: string;
    };
    attendeeHourlySurchargeCents?: number;
    attendeeSurchargeCents?: number;
    sessionDays?: Array<{
      date: string;
      startTime: string;
      endTime: string;
      durationHours: number;
      billableHours: number;
      subtotalCents: number;
    }>;
  };
  riskFlags: string[];
};

export type BookingCardProperty = {
  price: number;
  minimumNights?: number | null;
  cleaningFeeRate?: number | null;
  weeklyDiscountRate?: number | null;
  monthlyDiscountRate?: number | null;
  eventHourlyFromCents?: number | null;
  minimumEventHours?: number | null;
  maxEventGuests?: number | null;
  attendeePricingTiers?: AttendeePricingTier[] | null;
  eventInstantBookEnabled?: boolean;
  eventCurfewTime?: string | null;
  eventMultiDayDiscountPct?: number | null;
  eventOvernightHoldingPct?: number | null;
  basePowerDetails?: string | null;
  timezone?: string | null;
  baseParkingCapacity?: number | null;
};

export interface BookingCardProps {
  property: BookingCardProperty;
  propertyTitle?: string;
  onOpenCalendar: (mode: 'checkin' | 'checkout') => void;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  onGuestChange: (increment: boolean) => void;
  nights: number;
  minimumNights?: number | null;
  user: User | null;
  resolvedPropertyId?: string;
  compact?: boolean;
  anchorId?: string;
}
