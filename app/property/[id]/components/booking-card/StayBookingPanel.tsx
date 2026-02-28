import { Minus, Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import InlineCheckoutForm from '@/components/payments/InlineCheckoutForm';
import { calculatePricing, toCurrency } from '@/lib/pricing';
import { BookingCardProperty } from './types';

type Props = {
  property: BookingCardProperty;
  propertyId: string;
  propertyTitle?: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  nights: number;
  minimumNights?: number | null;
  onOpenCalendar: (mode: 'checkin' | 'checkout') => void;
  onGuestChange: (increment: boolean) => void;
  user: User | null;
  onRequireAuth: () => void;
};

export default function StayBookingPanel({
  property,
  propertyId,
  propertyTitle,
  checkInDate,
  checkOutDate,
  guests,
  nights,
  minimumNights,
  onOpenCalendar,
  onGuestChange,
  user,
  onRequireAuth,
}: Props) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const pricing = useMemo(() => {
    const base = calculatePricing({
      pricePerNight: property.price,
      nights,
      guests: 1,
      discountWeekly: property.weeklyDiscountRate ?? 0.2,
      discountMonthly: property.monthlyDiscountRate ?? 0.4,
    });
    const cleaningRate = property.cleaningFeeRate ?? base.cleaningRate;
    const cleaningFee = Math.round(base.subtotalBeforeFees * cleaningRate);
    const subtotal = base.subtotalBeforeFees + cleaningFee + base.serviceFee;
    return {
      baseTotal: base.subtotalBeforeFees,
      cleaningFee,
      total: subtotal + base.tax,
    };
  }, [property, nights]);

  const minStayNights = Math.max(
    1,
    typeof minimumNights === 'number' ? minimumNights : property.minimumNights ?? 1
  );

  return (
    <>
      <p className="text-xl font-semibold">
        {toCurrency(property.price * minStayNights)}{' '}
        <span className="text-sm font-normal text-gray-500">for {minStayNights} nights</span>
      </p>

      <div className="mt-4 rounded-lg border border-gray-300">
        <div className="grid grid-cols-2">
          <button onClick={() => onOpenCalendar('checkin')} className="border-r border-gray-300 p-3 text-left">
            <p className="text-xs uppercase">Check-in</p>
            <p>{checkInDate || 'Add date'}</p>
          </button>
          <button onClick={() => onOpenCalendar('checkout')} className="p-3 text-left">
            <p className="text-xs uppercase">Checkout</p>
            <p>{checkOutDate || 'Add date'}</p>
          </button>
        </div>

        <div className="border-t border-gray-300 p-3">
          <p className="mb-2 text-xs uppercase">Guests</p>
          <div className="flex items-center justify-between">
            <span>{guests}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onGuestChange(false)}
                disabled={guests <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => onGuestChange(true)}
                disabled={guests >= 5}
                className="flex h-8 w-8 items-center justify-center rounded-full border"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{toCurrency(property.price)} x {nights}</span>
          <span>{toCurrency(pricing.baseTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cleaning fee</span>
          <span>{toCurrency(pricing.cleaningFee)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{toCurrency(pricing.total)}</span>
        </div>
      </div>

      <button
        onClick={() => (!user ? onRequireAuth() : setShowPaymentForm((open) => !open))}
        className="mt-4 w-full rounded-lg border border-[#8B1A1A] bg-[#F8F5F2] py-3 font-semibold text-[#8B1A1A] hover:bg-[#ede9e3]"
      >
        {user ? (showPaymentForm ? 'Hide payment form' : 'Reserve stay') : 'Sign in to Reserve'}
      </button>

      {user && (
        <InlineCheckoutForm
          expanded={showPaymentForm}
          amount={Math.max(0, Math.round(pricing.total * 100))}
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          checkIn={checkInDate || ''}
          checkOut={checkOutDate || ''}
          guests={guests}
          onCancel={() => setShowPaymentForm(false)}
          introText="Enter your card details to complete your reservation."
        />
      )}
    </>
  );
}
