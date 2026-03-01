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
import { X } from 'lucide-react';

// Import components
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
  const [showMobileBookingSheet, setShowMobileBookingSheet] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'checkin' | 'checkout'>('checkin');
  const supabase = useMemo(() => createClient(), []);

  // Supabase property + images
  interface DbPropertyRow {
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
  }
  interface HostProfileRow {
    id: string;
    full_name?: string | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    created_at: string | null;
  }
  const [dbProperty, setDbProperty] = useState<DbPropertyRow | null>(null);
  const [dbImages, setDbImages] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [dbTried, setDbTried] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [hostProfileError, setHostProfileError] = useState<string | null>(null);

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
        setDbError(null);
        const basePropertySelect = 'id,title,address,map_url,proximity_badge_1,proximity_badge_2,nightly_price,minimum_nights,bedrooms,bathrooms,sqft,cover_image_url,is_published,created_by,owner_id,about_space,indoor_outdoor_experiences,amenities_list,cleaning_fee_pct,weekly_discount_pct,weekly_price,monthly_discount_pct,monthly_price,host_bio,host_avatar_url';
        const extendedPropertySelect = `${basePropertySelect},event_hourly_from_cents,max_event_guests,event_instant_book_enabled,event_curfew_time`;

        const propertyFetchPromise = (async () => {
          const extendedResult = await supabase
            .from('properties')
            .select(extendedPropertySelect)
            .eq('id', pid)
            .limit(1)
            .maybeSingle();

          if (!extendedResult.error) return extendedResult;

          const message = extendedResult.error.message ?? '';
          const missingEventColumns =
            message.includes('event_hourly_from_cents') ||
            message.includes('max_event_guests') ||
            message.includes('event_instant_book_enabled') ||
            message.includes('event_curfew_time');

          if (!missingEventColumns) return extendedResult;

          return supabase
            .from('properties')
            .select(basePropertySelect)
            .eq('id', pid)
            .limit(1)
            .maybeSingle();
        })();

        const [propResult, imgsResult, blocksResult] = await Promise.all([
          propertyFetchPromise,
          supabase
            .from('property_images')
            .select('id,url,is_approved,sort_order')
            .eq('property_id', pid)
            .eq('is_approved', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true }),
          supabase
            .from('property_unavailable_dates')
            .select('date')
            .eq('property_id', pid),
        ]);

        const { data: prop, error, status } = propResult;
        if (error) {
          setDbError(error.message ?? 'Unable to load property');
        } else if (prop) {
          setDbProperty(prop as unknown as DbPropertyRow);
        } else if (status !== null) {
          setDbError('not_found');
        }

        const { data: imgs, error: imgsError } = imgsResult;
        if (!imgsError && Array.isArray(imgs) && imgs.length > 0) {
          setDbImages(imgs.map((i) => i.url));
        }

        const { data: blocks } = blocksResult;
        if (Array.isArray(blocks)) {
          const isoList = blocks
            .map((r: any) => r?.date)
            .filter(Boolean)
            .map((d: string) => new Date(d))
            .map((dt: Date) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())))
            .map((dt: Date) => dt.toISOString().slice(0, 10));
          setUnavailableDates(Array.from(new Set(isoList)));
        }
      } catch (error) {
        setDbError(error instanceof Error ? error.message : String(error));
      } finally {
        setDbTried(true);
      }
    }
    void loadDb();
  }, [params.id, supabase]);

  useEffect(() => {
    const hostId = dbProperty?.owner_id ?? dbProperty?.created_by;
    if (!hostId) return;
    if (hostProfile && hostProfile.id === hostId) return;

    let isActive = true;
    (async () => {
      try {
        const { data: userProfile, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('id,first_name,last_name,avatar_url,created_at')
          .eq('id', hostId)
          .limit(1)
          .maybeSingle();

        if (!isActive) return;

        if (userProfile) {
          setHostProfile({
            id: userProfile.id,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            full_name: [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || null,
            avatar_url: userProfile.avatar_url ?? null,
            created_at: userProfile.created_at ?? null,
          });
          setHostProfileError(null);
          return;
        }

        if (userProfileError && userProfileError.code !== 'PGRST116') {
          const msg = `[property-details] user_profiles lookup failed: ${userProfileError.message}`;
          console.warn(msg, userProfileError);
          setHostProfileError(msg);
        }

        const { data: profileFallback, error: legacyError } = await supabase
          .from('profiles')
          .select('id,full_name,name,avatar_url,created_at')
          .eq('id', hostId)
          .limit(1)
          .maybeSingle();

        if (!isActive) return;

        if (profileFallback) {
          setHostProfile(profileFallback as HostProfileRow);
          setHostProfileError(null);
          return;
        }

        if (legacyError && legacyError.code !== 'PGRST116') {
          const msg = `[property-details] profiles fallback lookup failed: ${legacyError.message}`;
          console.warn(msg, legacyError);
          setHostProfileError((prev) => prev ?? msg);
        }

        if (!userProfile && !profileFallback) {
          const msg = '[property-details] no host profile rows returned for host id ' + hostId;
          console.warn(msg);
          setHostProfileError((prev) => prev ?? msg);
        }
      } catch (err) {
        if (!isActive) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[property-details] unexpected host profile fetch error', err);
        setHostProfileError(errorMessage);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [dbProperty?.owner_id, dbProperty?.created_by, hostProfile, supabase]);

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
    { label: 'Flexible lease terms (days/weeks/months)', icon: CalendarClock },
    { label: 'Self check-in', icon: Shield },
  ];

  const derivedAmenities = (() => {
    if (dbProperty?.amenities_list?.length) {
      const lookup = new Map(amenityOptions.map((opt) => [opt.label, opt.icon]));
      return dbProperty.amenities_list
        .map((label) => ({ label, icon: lookup.get(label) ?? Wifi }))
        .map((item) => ({ label: item.label, icon: item.icon }));
    }
    return amenityOptions;
  })();

  if (propertyMissing) {
    return (
      <div className="min-h-screen bg-white">
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
    timezone: 'America/Chicago',
    baseParkingCapacity: 8,
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
        {/* Back Button */}
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

        {/* Property Gallery */}
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Property Information */}
          <PropertyInfo property={propertyWithDefaults} />

          {/* Booking Card */}
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

        {/* Reviews Section */}
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
