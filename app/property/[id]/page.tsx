'use client';

import {
  Wifi,
  Car,
  Tv,
  Utensils,
  Sofa,
  WashingMachine,
  CalendarClock,
  Shield,
} from 'lucide-react';
import AuthButton from '@/components/AuthButton';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Import components
import BookingCard from './components/BookingCard';
import CalendarModal from './components/CalendarModal';
import PropertyGallery from './components/PropertyGallery';
import PropertyInfo from './components/PropertyInfo';
import ReviewsSection from './components/ReviewsSection';
import { PROPERTY_DATA, PROPERTY_DETAIL_IMAGES } from '@/lib/data/properties';
import { notFound } from 'next/navigation';

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'checkin' | 'checkout'>('checkin');
  const supabase = useMemo(() => createClient(), []);

  // Supabase property + images
  interface DbPropertyRow {
    id: string;
    title: string;
    address: string;
    nightly_price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number | null;
    cover_image_url: string | null;
    is_published: boolean;
  }
  interface DbImageRow { id: string; url: string; is_approved: boolean; sort_order: number; }
  const [dbProperty, setDbProperty] = useState<DbPropertyRow | null>(null);
  const [dbImages, setDbImages] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [dbTried, setDbTried] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    async function loadDb() {
      const pid = params.id;
      try {
        const { data: prop, error } = await supabase
          .from('properties')
          .select('id,title,address,nightly_price,bedrooms,bathrooms,sqft,cover_image_url,is_published')
          .eq('id', pid)
          .limit(1)
          .maybeSingle();
        if (!error && prop) setDbProperty(prop as unknown as DbPropertyRow);

        const { data: imgs } = await supabase
          .from('property_images')
          .select('id,url,is_approved,sort_order')
          .eq('property_id', pid)
          .eq('is_approved', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (imgs && imgs.length > 0) setDbImages(imgs.map(i => i.url));

        // Load unavailable (blocked) dates for booking calendar
        const { data: blocks } = await supabase
          .from('property_unavailable_dates')
          .select('date')
          .eq('property_id', pid);
        if (Array.isArray(blocks)) {
          const isoList = blocks
            .map((r: any) => r?.date)
            .filter(Boolean)
            .map((d: string) => new Date(d))
            .map((dt: Date) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())))
            .map((dt: Date) => dt.toISOString().slice(0, 10));
          setUnavailableDates(Array.from(new Set(isoList)));
        }
      } finally {
        setDbTried(true);
      }
    }
    void loadDb();
  }, [params.id, supabase]);

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
  const property = PROPERTY_DATA[params.id as keyof typeof PROPERTY_DATA];
  // Defer notFound() until after DB load to support DB-only IDs
  if (!property && dbTried && !dbProperty) {
    notFound();
  }

  const host =
    'host' in property && property.host ? property.host : DEFAULT_HOST;

  const baseFromDb = dbProperty
    ? {
        id: dbProperty.id,
        title: dbProperty.title,
        location: dbProperty.address,
        rating: 4.8,
        reviewCount: 0,
        price: dbProperty.nightly_price ?? 150,
        bedrooms: dbProperty.bedrooms,
        bathrooms: dbProperty.bathrooms,
        sqft: dbProperty.sqft,
        proximityBadges: [] as Array<{ text: string; bgColor: string; textColor: string }>,
        host,
        description: 'Comfortable, furnished rental for professionals.',
      }
    : null;

  const base = property ?? baseFromDb ?? {
    id: params.id,
    title: 'Property',
    location: '',
    rating: 4.8,
    reviewCount: 0,
    price: 150,
    bedrooms: 0,
    bathrooms: 0,
    sqft: null as unknown as number,
    proximityBadges: [] as Array<{ text: string; bgColor: string; textColor: string }>,
    host,
    description: 'Comfortable, furnished rental for professionals.',
  };

  const propertyWithDefaults = {
    ...base,
    // Override with Supabase data when available
    title: dbProperty?.title ?? base.title,
    location: dbProperty?.address ?? base.location,
    price: dbProperty?.nightly_price ?? base.price,
    bedrooms: dbProperty?.bedrooms ?? base.bedrooms,
    bathrooms: dbProperty?.bathrooms ?? base.bathrooms,
    sqft: dbProperty?.sqft ?? base.sqft,
    host,
    images: (dbImages.length > 0
      ? dbImages
      : dbProperty?.cover_image_url
        ? [dbProperty.cover_image_url, ...PROPERTY_DETAIL_IMAGES]
        : PROPERTY_DETAIL_IMAGES),
    amenities: [
      { icon: Wifi, label: 'Free WiFi' },
      { icon: Car, label: 'Free parking' },
      { icon: Tv, label: "55\" HDTV" },
      { icon: Utensils, label: 'Full kitchen' },
      { icon: Sofa, label: 'Fully furnished house' },
      { icon: WashingMachine, label: 'In-unit washer and dryer' },
      {
        icon: CalendarClock,
        label: 'Flexible lease terms (days/weeks/months)',
      },
      { icon: Shield, label: 'Self check-in' },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo/BR%20Logo.png"
                alt="Belle Rouge Properties logo"
                width={32}
                height={32}
                className="h-8 w-8 mr-2"
              />
              <h1 className="text-2xl font-bold text-gray-900">Belle Rouge Properties</h1>
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
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back to property listings"
          >
            ← Back to properties
          </button>
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
          unavailableDates={unavailableDates}
          selectedCheckOut={selectedCheckOut}
          onModeChange={setCalendarMode}
        />
      </div>
    </div>
  );
}
