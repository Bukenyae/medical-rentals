 'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Minus, Plus, Info } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';
import { useRouter, useParams } from 'next/navigation';
import { calculatePricing, toCurrency } from '@/lib/pricing';
import CheckoutDialog from '@/components/payments/CheckoutDialog';

interface BookingCardProps {
  property: {
    price: number;
    rating: number;
    reviewCount: number;
    weeklyDiscountPct?: number | null;
    weeklyDiscountRate?: number | null;
    weeklyPrice?: number | null;
    monthlyDiscountPct?: number | null;
    monthlyDiscountRate?: number | null;
    monthlyPrice?: number | null;
    cleaningFeeRate?: number | null;
    cleaningFeePctDisplay?: number | null;
    cleaningFeePct?: number | null;
  };
  propertyTitle?: string;
  onOpenCalendar: (mode: 'checkin' | 'checkout') => void;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  onGuestChange: (increment: boolean) => void;
  nights: number;
  user: User | null;
  // Optional resolved property UUID from parent page (preferred over route param)
  resolvedPropertyId?: string;
}

export default function BookingCard({
  property,
  propertyTitle,
  onOpenCalendar,
  checkInDate,
  checkOutDate,
  guests,
  onGuestChange,
  nights,
  user,
  resolvedPropertyId,
}: BookingCardProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = resolvedPropertyId || params?.id || '';
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingPopover, setShowPricingPopover] = useState(false);
  const pricingRef = useRef<HTMLDivElement | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const pricingExpanded = showPricingPopover ? 'true' : 'false';

  const weeklyDiscountRate = property.weeklyDiscountRate ?? (typeof property.weeklyDiscountPct === 'number' ? property.weeklyDiscountPct / 100 : 0.2);
  const monthlyDiscountRate = property.monthlyDiscountRate ?? (typeof property.monthlyDiscountPct === 'number' ? property.monthlyDiscountPct / 100 : 0.4);
  const pricing = calculatePricing({
    pricePerNight: property.price,
    nights,
    guests,
    discountWeekly: weeklyDiscountRate,
    discountMonthly: monthlyDiscountRate,
  });
  const subtotalBeforeFees = pricing.subtotalBeforeFees;
  const baseCleaningRate = typeof property.cleaningFeeRate === 'number'
    ? property.cleaningFeeRate
    : typeof property.cleaningFeePct === 'number'
      ? property.cleaningFeePct / 100
      : pricing.cleaningRate;
  const cleaningRate = Math.max(0, baseCleaningRate);
  const cleaningFee = Math.round(subtotalBeforeFees * cleaningRate);
  const serviceFee = pricing.serviceFee;
  const taxFee = pricing.tax;
  const subtotalWithFees = subtotalBeforeFees + cleaningFee + serviceFee;
  const totalPrice = subtotalWithFees + taxFee;
  const weeklyRate = property.weeklyPrice ?? Math.round(property.price * (1 - weeklyDiscountRate));
  const monthlyRate = property.monthlyPrice ?? Math.round(property.price * (1 - monthlyDiscountRate));
  const discountRate = pricing.discountRate;
  const standardSubtotal = pricing.base;
  const discountAmount = pricing.discountAmount;
  const effectiveNightly = pricing.effectiveNightly;
  const cleaningDisplayPct = Math.round(cleaningRate * 100);
  const discountDisplayLabel = nights >= 21
    ? `Monthly discount (${Math.round(monthlyDiscountRate * 100)}%)`
    : nights >= 7
      ? `Weekly discount (${Math.round(weeklyDiscountRate * 100)}%)`
      : null;

  // Persist booking draft to localStorage for Guest Portal price summary
  useEffect(() => {
    try {
      const draft = {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights,
        guests,
        pricePerNight: property.price,
        subtotal: subtotalBeforeFees,
        total: totalPrice,
        propertyId,
        currency: 'usd',
        propertyTitle: propertyTitle || undefined,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('booking:draft', JSON.stringify(draft));
      }
    } catch {
      // ignore
    }
  }, [checkInDate, checkOutDate, nights, guests, property.price, subtotalBeforeFees, totalPrice, propertyId, propertyTitle]);

  // Close popover on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (showPricingPopover && pricingRef.current && !pricingRef.current.contains(e.target as Node)) {
        setShowPricingPopover(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showPricingPopover]);

  // Handle Reserve button click
  const handleReserve = () => {
    if (!user) {
      // Open in-page auth modal for a seamless guest flow
      setShowAuthModal(true);
    } else {
      // Open Stripe checkout dialog
      setShowCheckout(true);
    }
  };

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24">
        <div className="border border-gray-200 rounded-xl p-6 shadow-lg booking-card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-2xl font-semibold">
              ${property.price}<span className="text-base font-normal text-gray-500">/night</span>
              {discountRate > 0 && (
                <div className="text-sm text-green-700 font-medium mt-1">
                  Your rate: ${effectiveNightly} / night ({nights >= 21 ? '40% monthly discount' : '20% weekly discount'})
                </div>
              )}
            </div>
          </div>
          <div className="mb-6 relative" ref={pricingRef}>
            {showPricingPopover ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded="true"
                onClick={() => setShowPricingPopover(false)}
                className="flex items-center text-xs text-gray-600 hover:text-gray-900 underline"
              >
                <Info className="w-4 h-4 mr-1" />
                How pricing works
              </button>
            ) : (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded="false"
                onClick={() => setShowPricingPopover(true)}
                className="flex items-center text-xs text-gray-600 hover:text-gray-900 underline"
              >
                <Info className="w-4 h-4 mr-1" />
                How pricing works
              </button>
            )}
            <div
              role="dialog"
              aria-label="Pricing details"
              className={`absolute z-50 mt-2 right-0 w-72 rounded-lg border border-gray-200 bg-white shadow-xl p-4 text-sm transform transition ease-out duration-150 origin-top-right ${showPricingPopover ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              <div className="font-semibold text-gray-900 mb-2">Tiered discounts</div>
              <ul className="space-y-1 text-gray-700">
                <li>Base: ${property.price} / night</li>
                <li>7+ nights: {Math.round(weeklyDiscountRate * 100)}% off — ${weeklyRate} / night</li>
                <li>21+ nights: {Math.round(monthlyDiscountRate * 100)}% off — ${monthlyRate} / night</li>
              </ul>
              <div className="mt-3 text-gray-600">
                {nights > 0 ? (
                  <span>
                    Current selection: {nights} {nights === 1 ? 'night' : 'nights'} → {discountRate * 100}% off → ${effectiveNightly} / night
                  </span>
                ) : (
                  <span>Select your dates to see your nightly rate.</span>
                )}
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="border border-gray-300 rounded-lg mb-4">
            <div className="grid grid-cols-2">
              {/* Check-in Date */}
              <div className="p-3 border-r border-gray-300">
                <div className="text-xs font-semibold text-gray-900 uppercase">Check-in</div>
                <button 
                  onClick={() => onOpenCalendar('checkin')}
                  className="flex items-center justify-between w-full text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{checkInDate || 'Add date'}</span>
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              
              {/* Check-out Date */}
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-900 uppercase">Checkout</div>
                <button 
                  onClick={() => onOpenCalendar('checkout')}
                  className="flex items-center justify-between w-full text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{checkOutDate || 'Add date'}</span>
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Guests Selection */}
            <div className="p-3 border-t border-gray-300">
              <div className="text-xs font-semibold text-gray-900 uppercase mb-2">Guests</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
                <div className="flex items-center space-x-3">
                  <button 
                    aria-label="Decrease guests"
                    onClick={() => onGuestChange(false)}
                    disabled={guests <= 1}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{guests}</span>
                  <button 
                    aria-label="Increase guests"
                    onClick={() => onGuestChange(true)}
                    disabled={guests >= 8}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-700">
                ${property.price} x {nights} {nights === 1 ? 'night' : 'nights'} x {guests} {guests === 1 ? 'guest' : 'guests'}
                {discountRate > 0 && (
                  <span className="ml-2 text-gray-500">(Your rate: ${effectiveNightly} / night)</span>
                )}
              </span>
              <span className="text-gray-900">{toCurrency(standardSubtotal)}</span>
            </div>
            {discountRate > 0 && discountDisplayLabel && (
              <div className="flex justify-between text-green-700">
                <span>{discountDisplayLabel}</span>
                <span>- ${discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900">{toCurrency(subtotalBeforeFees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Cleaning fee ({cleaningDisplayPct}%)</span>
              <span className="text-gray-900">{toCurrency(cleaningFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Service fee (14%)</span>
              <span className="text-gray-900">{toCurrency(serviceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Taxes (13%)</span>
              <span className="text-gray-900">{toCurrency(taxFee)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mb-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{toCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Reserve Button */}
          <button 
            onClick={handleReserve}
            className="w-full bg-[#F8F5F2] hover:bg-[#ede9e3] text-[#8B1A1A] border border-[#8B1A1A] py-3 rounded-lg font-semibold text-lg transition-all mb-4"
          >
            {user ? 'Reserve' : 'Sign in to Reserve'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            {user ? 'You won\'t be charged yet' : 'Please sign in to complete your reservation securely'}
          </p>
        </div>

        {/* Report Listing */}
        <div className="mt-6 text-center">
          <button className="flex items-center text-gray-600 hover:text-gray-900 underline mx-auto">
            <span className="w-4 h-4 mr-1">🚩</span>
            Report this listing
          </button>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
        forceRole="guest"
      />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        amount={Math.max(0, Math.round(totalPrice * 100))}
        currency="usd"
        metadata={{
          check_in: checkInDate || '',
          check_out: checkOutDate || '',
          guests: String(guests),
          nights: String(nights),
        }}
        propertyId={propertyId}
        propertyTitle={propertyTitle}
        checkIn={checkInDate || ''}
        checkOut={checkOutDate || ''}
        guests={guests}
        onSuccess={({ bookingId, paymentIntentId }) => {
          console.log('Payment successful:', paymentIntentId);
          setShowCheckout(false);
          setTimeout(() => {
            router.push(`/portal/guest/confirmation?booking=${encodeURIComponent(bookingId)}`);
          }, 400);
        }}
      />
    </div>
  );
}
