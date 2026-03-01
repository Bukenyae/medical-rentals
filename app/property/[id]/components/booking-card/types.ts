import { User } from '@supabase/supabase-js';

export type BookingRail = 'stay' | 'event';

export type EventQuote = {
  mode: 'request' | 'instant';
  subtotalCents: number;
  feesCents: number;
  addonsTotalCents: number;
  totalCents: number;
  depositCents: number;
  riskFlags: string[];
};

export type BookingCardProperty = {
  price: number;
  minimumNights?: number | null;
  cleaningFeeRate?: number | null;
  weeklyDiscountRate?: number | null;
  monthlyDiscountRate?: number | null;
  eventHourlyFromCents?: number | null;
  maxEventGuests?: number | null;
  eventInstantBookEnabled?: boolean;
  eventCurfewTime?: string | null;
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
