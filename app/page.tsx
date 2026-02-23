'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import PropertyCard from '@/components/PropertyCard';
import Footer from '@/components/Footer';
import HomePropertiesSkeleton from '@/components/HomePropertiesSkeleton';
import { createClient } from '@/lib/supabase/client';
import {
  fetchPublishedProperties,
  PROPERTIES_REFRESH_EVENT,
  PublishedPropertyRecord,
} from '@/lib/queries/properties';

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDates, setSelectedDates] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [dbProperties, setDbProperties] = useState<PublishedPropertyRecord[]>([]);
  const [propertiesTried, setPropertiesTried] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [loadingProps, setLoadingProps] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleLocationChange = (location: string, propertyId: string) => {
    setSelectedLocation(location);
    setSelectedPropertyId(propertyId);
  };

  const handleDatesChange = (dates: string) => {
    setSelectedDates(dates);
  };

  const handleGuestsChange = (guests: number) => {
    setSelectedGuests(guests);
  };

  const loadPublished = useCallback(async () => {
    try {
      setLoadingProps(true);
      setPropertiesError(null);
      const data = await fetchPublishedProperties(supabase);
      setDbProperties(data);
    } catch (error) {
      console.error('Failed to load published properties', error);
      const message = error instanceof Error ? error.message : String(error);
      setPropertiesError(message || 'Unable to load properties. Please try again later.');
    } finally {
      setPropertiesTried(true);
      setLoadingProps(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  useEffect(() => {
    const handler = () => {
      void loadPublished();
    };
    window.addEventListener(PROPERTIES_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PROPERTIES_REFRESH_EVENT, handler);
  }, [loadPublished]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const gridColumnsClass = 'grid-cols-1 md:grid-cols-2';
  const locationOptions = dbProperties.map((property) => ({
    name: property.title ?? 'Belle Rouge Property',
    address: property.address ?? 'Baton Rouge, LA',
    propertyId: property.id,
  }));

  return (
    <div className="min-h-screen bg-white">
      <Header
        selectedLocation={selectedLocation}
        selectedDates={selectedDates}
        selectedGuests={selectedGuests}
        selectedPropertyId={selectedPropertyId}
        onLocationChange={handleLocationChange}
        onDatesChange={handleDatesChange}
        onGuestsChange={handleGuestsChange}
        isScrolled={isScrolled}
        locationOptions={locationOptions}
      />

      <HeroSection
        selectedLocation={selectedLocation}
        selectedDates={selectedDates}
        selectedGuests={selectedGuests}
        selectedPropertyId={selectedPropertyId}
        onLocationChange={handleLocationChange}
        onDatesChange={handleDatesChange}
        onGuestsChange={handleGuestsChange}
        isScrolled={isScrolled}
        locationOptions={locationOptions}
      />

      <section className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid ${gridColumnsClass} gap-4 sm:gap-6 lg:gap-8`}>
            {!propertiesTried && loadingProps && <HomePropertiesSkeleton count={4} />}
            {propertiesTried && propertiesError && (
              <div className="col-span-full rounded-3xl border border-rose-200 bg-rose-50 px-6 py-16 text-center text-rose-700">
                {propertiesError}
              </div>
            )}
            {propertiesTried && !propertiesError && dbProperties.length === 0 && !loadingProps && (
              <div className="col-span-full rounded-3xl border border-dashed border-gray-300 bg-white/80 px-6 py-16 text-center">
                <h3 className="text-xl font-semibold text-gray-900">No listings published yet</h3>
                <p className="mt-2 text-gray-600">
                  Publish a property from your host dashboard to have it appear on the home page.
                </p>
              </div>
            )}
            {dbProperties.length > 0 && dbProperties.map((p, index) => (
              <PropertyCard
                key={p.id}
                id={p.id}
                title={p.title ?? 'Untitled listing'}
                description={p.description ?? 'Comfortable, furnished rental for professionals.'}
                rating={4.8}
                reviewCount={120}
                price={p.nightly_price ?? 150}
                minimumNights={p.minimum_nights ?? 1}
                bedrooms={p.bedrooms ?? 0}
                bathrooms={p.bathrooms ?? 0}
                sqft={p.sqft ?? 0}
                imageUrl={p.cover_image_url ?? '/images/placeholder/house.jpg'}
                imageAlt={p.title ?? 'Rental property'}
                hoverTint={index % 2 === 0 ? '#FFE9D4' : '#E6F3C2'}
              />
            ))}
          </div>

          <div className="text-center mt-6">
            <div className="flex gap-2 max-w-7xl mx-auto overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex gap-2 min-w-max px-2">
                {[
                  'Free parking',
                  'In-unit washer and dryer',
                  'Full kitchen',
                  'Wi-Fi',
                  'Fully furnished units',
                  'Utilities included',
                  'Flexible lease terms',
                  'Workspace',
                  'Outdoor space'
                ].map((amenity, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-white border border-gray-300 border-opacity-50 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-[12px] font-semibold text-center leading-tight text-gray-900/60">
            Trusted by 500+ medical staff, academics, military members, students, and young professionals.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
