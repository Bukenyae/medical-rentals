'use client';

import {
  Wifi,
  Car,
  Tv,
  Utensils,
  Sofa,
  WashingMachine,
} from 'lucide-react';
import AuthButton from '@/components/AuthButton';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import BookingCard from './components/BookingCard';
import CalendarModal from './components/CalendarModal';
import PropertyGallery from './components/PropertyGallery';
import PropertyInfo from './components/PropertyInfo';
import ReviewsSection from './components/ReviewsSection';
import PropertyLocationMap from './components/PropertyLocationMap';
import Footer from '@/components/Footer';
import PropertyDetailsSkeleton from './components/PropertyDetailsSkeleton';

const FALLBACK_DETAIL_IMAGES = [
  '/images/properties/Leighton/living-room.jpg',
  '/images/properties/Leighton/bedroom-one.jpg',
  '/images/properties/Leighton/kitchen.jpg',
  '/images/properties/Leighton/bathroom.jpg',
  '/images/properties/Leighton/bedroom-two.jpg',
  '/images/properties/Leighton/dining-one.jpg',
  '/images/properties/Leighton/dining-two.jpg',
];

export interface DbPropertyRow {
  id: string;
  title: string;
  address: string;
  map_url: string | null;
  proximity_badge_1: string | null;
  proximity_badge_2: string | null;
  nightly_price: number;
  minimum_nights?: number | null;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_by?: string | null;
  owner_id?: string | null;
  about_space?: string | null;
  indoor_outdoor_experiences?: string | null;
  amenities_list?: string[] | null;
  cleaning_fee_pct?: number | null;
  weekly_discount_pct?: number | null;
  weekly_price?: number | null;
  monthly_discount_pct?: number | null;
  monthly_price?: number | null;
  host_bio?: string | null;
  host_avatar_url?: string | null;
  event_hourly_from_cents?: number | null;
  max_event_guests?: number | null;
  event_instant_book_enabled?: boolean | null;
  event_curfew_time?: string | null;
  event_multi_day_discount_pct?: number | null;
  event_overnight_holding_pct?: number | null;
  base_power_details?: string | null;
  base_parking_capacity?: number | null;
}

export interface HostProfileRow {
  id: string;
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface PropertyDetailsClientProps {
  initialDbProperty: DbPropertyRow | null;
  initialDbImages: string[];
  initialUnavailableDates: string[];
  initialDbError: string | null;
  initialHostProfile: HostProfileRow | null;
}

export default function PropertyDetailsClient({
  initialDbProperty,
  initialDbImages,
  initialUnavailableDates,
  initialDbError,
  initialHostProfile,
}: PropertyDetailsClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMobileBookingSheet, setShowMobileBookingSheet] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'checkin' | 'checkout'>('checkin');
  const [isMobileHeaderVisible, setIsMobileHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const mobileHeaderVisibleRef = useRef(true);
  const supabase = useMemo(() => createClient(), []);

  const [dbProperty] = useState<DbPropertyRow | null>(initialDbProperty);
  const [dbImages] = useState<string[]>(initialDbImages);
  const [unavailableDates] = useState<string[]>(initialUnavailableDates);
  const [dbTried] = useState(true);
  const [dbError] = useState<string | null>(initialDbError);
  const [hostProfile] = useState<HostProfileRow | null>(initialHostProfile);
  const [hostProfileError] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastScrollYRef.current = window.scrollY;
    const minimumDelta = 8;
    const revealAtTopY = 16;

    const setHeaderVisibility = (nextVisible: boolean) => {
      if (mobileHeaderVisibleRef.current === nextVisible) return;
      mobileHeaderVisibleRef.current = nextVisible;
      setIsMobileHeaderVisible(nextVisible);
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= revealAtTopY) {
        setHeaderVisibility(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const delta = currentScrollY - lastScrollYRef.current;
      if (Math.abs(delta) < minimumDelta) return;

      setHeaderVisibility(delta < 0);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGuestChange = (increment: boolean) => {
    if (increment && guests < 8) {
      setGuests(guests + 1);
    } else if (!increment && guests > 1) {
      setGuests(guests - 1);
    }
  };

  const handleApplyDateRange = (checkIn: Date, checkOut: Date) => {
    setSelectedCheckIn(checkIn);
    setSelectedCheckOut(checkOut);
    setCheckInDate(checkIn.toLocaleDateString('en-US'));
    setCheckOutDate(checkOut.toLocaleDateString('en-US'));
    setShowCalendar(false);
  };

  const handleResetDateRange = () => {
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setCheckInDate('');
    setCheckOutDate('');
  };

  const openCalendar = (mode: 'checkin' | 'checkout') => {
    setCalendarMode(mode);
    setShowCalendar(true);
  };

  const calculateNights = () => {
    if (!selectedCheckIn || !selectedCheckOut) {
      return 1;
    }
    const timeDiff = selectedCheckOut.getTime() - selectedCheckIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return nights > 0 ? nights : 1;
  };

  const selectedNights = calculateNights();

  const parseNumeric = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const propertyMissing = dbTried && !dbProperty && (!dbError || dbError === 'not_found');

  const amenityOptions = [
    { label: 'Free WiFi', icon: Wifi },
    { label: 'Free parking', icon: Car },
    { label: "55\" HDTV", icon: Tv },
    { label: 'Full kitchen', icon: Utensils },
    { label: 'Fully furnished house', icon: Sofa },
    { label: 'In-unit washer and dryer', icon: WashingMachine },
  ];

  const derivedAmenities = (() => {
    const excludedAmenityLabels = new Set([
      'Flexible lease terms (days/weeks/months)',
      'Self check-in',
    ]);

    if (dbProperty?.amenities_list?.length) {
      const lookup = new Map(amenityOptions.map((opt) => [opt.label, opt.icon]));
      return dbProperty.amenities_list
        .filter((label) => !excludedAmenityLabels.has(label))
        .slice(0, 6)
        .map((label) => ({ label, icon: lookup.get(label) ?? Wifi }))
        .map((item) => ({ label: item.label, icon: item.icon }));
    }
    return amenityOptions.slice(0, 6);
  })();

  const headerVisibilityClass = isMobileHeaderVisible
    ? 'translate-y-0 opacity-100'
    : '-translate-y-full opacity-0 pointer-events-none';

  if (propertyMissing) {
    return (
      <div className="min-h-screen bg-white">
        <header
          className={`sticky top-0 z-50 border-b border-gray-200 bg-white transition-transform transition-opacity duration-200 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100 ${headerVisibilityClass}`}
        >
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

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-semibold text-gray-900">Listing unavailable</h2>
          <p className="mt-4 text-gray-600">
            This property may have been unpublished or removed. Please return to the homepage to explore other stays.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Browse properties
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (!dbProperty) {
    if (!dbTried) {
      return (
        <div className="min-h-screen bg-white">
          <PropertyDetailsSkeleton />
          <Footer />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md text-center text-sm text-gray-600">
          {dbError && dbError !== 'not_found'
            ? dbError
            : 'We could not load this listing. Please try again later.'}
        </div>
        <Footer />
      </div>
    );
  }

  const propertyRow = dbProperty;

  const resolvedHost = (() => {
    const profileNameRaw = hostProfile?.full_name ??
      [hostProfile?.first_name, hostProfile?.last_name]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(' ');
    const profileName = (profileNameRaw ?? '').trim();
    const name = profileName.length ? profileName : 'Host';

    return {
      name,
      avatar: hostProfile?.avatar_url || propertyRow.host_avatar_url || '/images/host-avatar.jpg',
      joinedYear: hostProfile?.created_at
        ? new Date(hostProfile.created_at).getFullYear().toString()
        : undefined,
      rating: 4.8,
      reviewCount: 0,
    };
  })();

  const hostAlert = hostProfileError && process.env.NODE_ENV !== 'production'
    ? hostProfileError
    : null;

  const nightlyPrice = parseNumeric(propertyRow.nightly_price) ?? 150;
  const minimumNights = parseNumeric(propertyRow.minimum_nights) ?? 1;
  const nights = Math.max(selectedNights, minimumNights);
  const bedrooms = parseNumeric(propertyRow.bedrooms) ?? 0;
  const bathrooms = parseNumeric(propertyRow.bathrooms) ?? 0;
  const sqft = parseNumeric(propertyRow.sqft) ?? 0;

  const cleaningFeePct = parseNumeric(propertyRow.cleaning_fee_pct);
  const weeklyDiscountPct = parseNumeric(propertyRow.weekly_discount_pct);
  const monthlyDiscountPct = parseNumeric(propertyRow.monthly_discount_pct);

  const propertyWithDefaults = {
    id: propertyRow.id,
    title: propertyRow.title ?? 'Property',
    location: propertyRow.address ?? '',
    mapUrl: propertyRow.map_url ?? null,
    rating: 4.8,
    reviewCount: 0,
    price: nightlyPrice,
    minimumNights,
    bedrooms,
    bathrooms,
    sqft,
    host: resolvedHost,
    proximityBadges: [
      ...(propertyRow.proximity_badge_1
        ? [{ text: propertyRow.proximity_badge_1, bgColor: 'bg-blue-50', textColor: 'text-blue-700' }]
        : []),
      ...(propertyRow.proximity_badge_2
        ? [{ text: propertyRow.proximity_badge_2, bgColor: 'bg-blue-50', textColor: 'text-blue-700' }]
        : []),
    ],
    images: dbImages.length > 0
      ? dbImages
      : propertyRow.cover_image_url
        ? [propertyRow.cover_image_url, ...FALLBACK_DETAIL_IMAGES]
        : FALLBACK_DETAIL_IMAGES,
    description: propertyRow.about_space ?? '',
    professionalsDesc: propertyRow.indoor_outdoor_experiences ?? '',
    amenities: derivedAmenities,
    cleaningFeePct,
    cleaningFeeRate: cleaningFeePct === null ? null : cleaningFeePct / 100,
    weeklyDiscountPct,
    weeklyDiscountRate: weeklyDiscountPct === null ? null : weeklyDiscountPct / 100,
    weeklyPrice: parseNumeric(propertyRow.weekly_price),
    monthlyDiscountPct,
    monthlyDiscountRate: monthlyDiscountPct === null ? null : monthlyDiscountPct / 100,
    monthlyPrice: parseNumeric(propertyRow.monthly_price),
    hostBio: propertyRow.host_bio ?? null,
    hostAvatarUrl: propertyRow.host_avatar_url ?? null,
    eventHourlyFromCents: parseNumeric(propertyRow.event_hourly_from_cents) ?? 12500,
    maxEventGuests: parseNumeric(propertyRow.max_event_guests) ?? 20,
    eventInstantBookEnabled: !!propertyRow.event_instant_book_enabled,
    eventCurfewTime: propertyRow.event_curfew_time ?? null,
    eventMultiDayDiscountPct: parseNumeric(propertyRow.event_multi_day_discount_pct) ?? 0,
    eventOvernightHoldingPct: parseNumeric(propertyRow.event_overnight_holding_pct) ?? 25,
    basePowerDetails: propertyRow.base_power_details ?? 'Standard residential supply',
    timezone: 'America/Chicago',
    baseParkingCapacity: parseNumeric(propertyRow.base_parking_capacity) ?? 8,
  };

  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const mobileStayLabel = `${money.format(propertyWithDefaults.price)}/night`;
  const mobileEventLabel = `${money.format((propertyWithDefaults.eventHourlyFromCents ?? 12500) / 100)}/hr`;

  return (
    <div className="min-h-screen bg-white">
      <header
        className={`sticky top-0 z-50 border-b border-gray-200 bg-white transition-transform transition-opacity duration-200 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100 ${headerVisibilityClass}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center">
              <span className="sr-only">Belle Rouge Properties</span>
              <Image
                src="/images/logo/BelleRougeLogo.png"
                alt="Belle Rouge Properties logo"
                width={200}
                height={48}
                className="h-8 w-auto"
                priority
                quality={100}
              />
            </Link>
            <nav className="flex items-center space-x-4">
              <AuthButton user={user} />
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-0 pb-28 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-8">
        <div className="mb-6 hidden lg:block">
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

        {(dbError || hostAlert) && (
          <div
            className="mb-6 space-y-3"
          >
            {dbError && process.env.NODE_ENV !== 'production' && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                {dbError}
              </div>
            )}
            {hostAlert && (
              <div
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                role="alert"
              >
                {hostAlert}
              </div>
            )}
          </div>
        )}

        <PropertyGallery 
          images={propertyWithDefaults.images} 
          title={propertyWithDefaults.title} 
          onBack={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <PropertyInfo property={propertyWithDefaults} />

          <BookingCard
            property={propertyWithDefaults}
            propertyTitle={propertyWithDefaults.title}
            onOpenCalendar={openCalendar}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guests={guests}
            onGuestChange={handleGuestChange}
            nights={nights}
            minimumNights={minimumNights}
            user={user}
            resolvedPropertyId={dbProperty?.id}
          />
        </div>

        <div className="mt-8 lg:mt-12">
          <ReviewsSection 
            rating={propertyWithDefaults.rating} 
            reviewCount={propertyWithDefaults.reviewCount} 
          />
        </div>

        {propertyWithDefaults.mapUrl || propertyWithDefaults.location ? (
          <div className="mt-8 lg:mt-12">
            <PropertyLocationMap
              address={propertyWithDefaults.location}
              mapUrl={propertyWithDefaults.mapUrl}
              title={propertyWithDefaults.title}
            />
          </div>
        ) : null}

        <CalendarModal
          showCalendar={showCalendar}
          onClose={() => setShowCalendar(false)}
          calendarMode={calendarMode}
          onApply={handleApplyDateRange}
          onReset={handleResetDateRange}
          selectedCheckIn={selectedCheckIn}
          unavailableDates={unavailableDates}
          selectedCheckOut={selectedCheckOut}
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{mobileStayLabel}</p>
            <p className="truncate text-xs text-gray-600">Event {mobileEventLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMobileBookingSheet(true)}
            className="shrink-0 rounded-full bg-[#8B1A1A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#731414]"
          >
            Reserve
          </button>
        </div>
      </div>

      {showMobileBookingSheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Booking options">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close booking sheet"
            onClick={() => setShowMobileBookingSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Book this property</p>
              <button
                type="button"
                onClick={() => setShowMobileBookingSheet(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700"
                aria-label="Close booking sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BookingCard
              property={propertyWithDefaults}
              propertyTitle={propertyWithDefaults.title}
              onOpenCalendar={openCalendar}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              guests={guests}
              onGuestChange={handleGuestChange}
              nights={nights}
              minimumNights={minimumNights}
              user={user}
              resolvedPropertyId={dbProperty?.id}
              compact
              anchorId=""
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
