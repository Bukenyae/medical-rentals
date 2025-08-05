'use client';

import { Heart, Wifi, Car, Tv, Utensils, Waves, Shield } from 'lucide-react';
import AuthButton from '@/components/AuthButton';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Import components
import BookingCard from './components/BookingCard';
import CalendarModal from './components/CalendarModal';
import PropertyGallery from './components/PropertyGallery';
import PropertyInfo from './components/PropertyInfo';
import ReviewsSection from './components/ReviewsSection';
import { PROPERTY_DATA, PROPERTY_DETAIL_IMAGES } from '@/lib/data/properties';

const DEFAULT_HOST = {
  name: 'Sarah',
  avatar: '/images/host-avatar.jpg',
  joinedYear: '2019',
  reviewCount: 89,
  rating: 4.8,
};

interface PropertyDetailsProps {
  params: {
    id: string;
  };
}

export default function PropertyDetails({ params }: PropertyDetailsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'checkin' | 'checkout'>('checkin');
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  // Handler functions
  const handleGuestChange = (increment: boolean) => {
    if (increment && guests < 8) {
      setGuests(guests + 1);
    } else if (!increment && guests > 1) {
      setGuests(guests - 1);
    }
  };

  const handleDateSelect = (date: Date) => {
    if (calendarMode === 'checkin') {
      setSelectedCheckIn(date);
      setCheckInDate(date.toLocaleDateString('en-US'));
      // If checkout is before checkin, clear it
      if (selectedCheckOut && selectedCheckOut <= date) {
        setSelectedCheckOut(null);
        setCheckOutDate('');
      }
      // Auto switch to checkout mode
      setCalendarMode('checkout');
    } else {
      // Only allow checkout dates after checkin
      if (selectedCheckIn && date > selectedCheckIn) {
        setSelectedCheckOut(date);
        setCheckOutDate(date.toLocaleDateString('en-US'));
        setShowCalendar(false);
      }
    }
  };

  const openCalendar = (mode: 'checkin' | 'checkout') => {
    setCalendarMode(mode);
    setShowCalendar(true);
  };

  // Calculate nights between dates
  const calculateNights = () => {
    if (!selectedCheckIn || !selectedCheckOut) {
      return 1; // Default to 1 night if dates not selected
    }
    const timeDiff = selectedCheckOut.getTime() - selectedCheckIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return nights > 0 ? nights : 1;
  };

  const nights = calculateNights();

  // Property data matching the property cards
  const property = PROPERTY_DATA[params.id as keyof typeof PROPERTY_DATA] || PROPERTY_DATA['1'];
  const host = property.host ?? DEFAULT_HOST;

  const propertyWithDefaults = {
    ...property,
    host,
    images: PROPERTY_DETAIL_IMAGES,
    amenities: [
      { icon: Wifi, label: "Free WiFi" },
      { icon: Car, label: "Free parking" },
      { icon: Tv, label: "55\" HDTV" },
      { icon: Utensils, label: "Full kitchen" },
      { icon: Waves, label: "Pool access" },
      { icon: Shield, label: "Self check-in" }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Bayou Medical Rentals</h1>
            </Link>
            <nav className="flex items-center space-x-4">
              <AuthButton user={user} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to properties
          </Link>
        </div>

        {/* Property Gallery */}
        <PropertyGallery 
          images={propertyWithDefaults.images} 
          title={propertyWithDefaults.title} 
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Property Information */}
          <PropertyInfo property={propertyWithDefaults} />

          {/* Booking Card */}
          <BookingCard
            property={propertyWithDefaults}
            onOpenCalendar={openCalendar}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guests={guests}
            onGuestChange={handleGuestChange}
            nights={nights}
            user={user}
          />
        </div>

        {/* Reviews Section */}
        <div className="mt-8 lg:mt-12">
          <ReviewsSection 
            rating={propertyWithDefaults.rating} 
            reviewCount={propertyWithDefaults.reviewCount} 
          />
        </div>

        {/* Calendar Modal */}
        <CalendarModal
          showCalendar={showCalendar}
          onClose={() => setShowCalendar(false)}
          calendarMode={calendarMode}
          onDateSelect={handleDateSelect}
          selectedCheckIn={selectedCheckIn}
          selectedCheckOut={selectedCheckOut}
          onModeChange={setCalendarMode}
        />
      </div>
    </div>
  );
}
