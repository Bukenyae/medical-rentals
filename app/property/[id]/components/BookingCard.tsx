'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import AuthModal from '@/components/AuthModal';
import EventBookingPanel from './booking-card/EventBookingPanel';
import StayBookingPanel from './booking-card/StayBookingPanel';
import { BookingCardProps, BookingRail } from './booking-card/types';

export default function BookingCard({
  property,
  propertyTitle,
  onOpenCalendar,
  checkInDate,
  checkOutDate,
  guests,
  onGuestChange,
  nights,
  minimumNights,
  user,
  resolvedPropertyId,
}: BookingCardProps) {
  const params = useParams<{ id: string }>();
  const propertyId = resolvedPropertyId || params?.id || '';

  const [rail, setRail] = useState<BookingRail>('stay');
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="lg:col-span-1" id="booking-panel">
      <div className="lg:sticky lg:top-24">
        <div className="rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="mb-4 grid grid-cols-2 rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setRail('stay')}
              className={`rounded-md py-2 text-sm font-semibold ${rail === 'stay' ? 'bg-gray-900 text-white' : 'text-gray-700'}`}
            >
              Stay
            </button>
            <button
              onClick={() => setRail('event')}
              className={`rounded-md py-2 text-sm font-semibold ${rail === 'event' ? 'bg-gray-900 text-white' : 'text-gray-700'}`}
            >
              Event
            </button>
          </div>

          {rail === 'stay' ? (
            <StayBookingPanel
              property={property}
              propertyId={propertyId}
              propertyTitle={propertyTitle}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              guests={guests}
              nights={nights}
              minimumNights={minimumNights}
              onOpenCalendar={onOpenCalendar}
              onGuestChange={onGuestChange}
              user={user}
              onRequireAuth={() => setShowAuthModal(true)}
            />
          ) : (
            <EventBookingPanel
              property={property}
              propertyId={propertyId}
              user={user}
              onRequireAuth={() => setShowAuthModal(true)}
            />
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
        forceRole="guest"
      />
    </div>
  );
}
