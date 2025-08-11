'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import PropertyCard from '@/components/PropertyCard';
import AboutSection from '@/components/AboutSection';
import PropertyManagementSection from '@/components/PropertyManagementSection';
import CustomerSuccessSection from '@/components/CustomerSuccessSection';
import { PROPERTY_DATA, PROPERTY_IMAGES } from '@/lib/data/properties';
import { createClient } from '@/lib/supabase/client';

interface DbProperty {
  id: string;
  title: string;
  address: string;
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  cover_image_url: string | null;
  is_published: boolean;
  nightly_price: number | null;
  proximity_badge_1?: string | null;
  proximity_badge_2?: string | null;
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDates, setSelectedDates] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [dbProperties, setDbProperties] = useState<DbProperty[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);

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

  useEffect(() => {
    async function load() {
      setLoadingProps(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id,title,address,description,bedrooms,bathrooms,cover_image_url,is_published,nightly_price,proximity_badge_1,proximity_badge_2')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (!error && data) setDbProperties(data as unknown as DbProperty[]);
      setLoadingProps(false);
    }
    load();
  }, [supabase]);

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
      />

      <HeroSection
        selectedLocation={selectedLocation}
        selectedDates={selectedDates}
        selectedGuests={selectedGuests}
        selectedPropertyId={selectedPropertyId}
        onLocationChange={handleLocationChange}
        onDatesChange={handleDatesChange}
        onGuestsChange={handleGuestsChange}
      />

      {/* Property Cards */}
      <section className="pt-8 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            {/* Amenity Badges - Mobile Optimized */}
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
          
          {/* Property Cards Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {(dbProperties.length > 0 ? dbProperties.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description ?? 'Comfortable, furnished rental for professionals.',
              rating: 4.8,
              reviewCount: 120,
              price: p.nightly_price ?? 150,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              sqft: 0,
              proximityBadges: [
                ...(p.proximity_badge_1 ? [{ text: p.proximity_badge_1, bgColor: 'bg-blue-50', textColor: 'text-blue-700' }] : []),
                ...(p.proximity_badge_2 ? [{ text: p.proximity_badge_2, bgColor: 'bg-blue-50', textColor: 'text-blue-700' }] : []),
              ],
              imageUrl: p.cover_image_url ?? '/images/placeholder/house.jpg',
              imageAlt: p.title,
            })) : Object.entries(PROPERTY_DATA).map(([id, property]) => ({
              id,
              title: property.title,
              description: property.description,
              rating: property.rating,
              reviewCount: property.reviewCount,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              sqft: property.sqft,
              proximityBadges: property.proximityBadges,
              imageUrl: PROPERTY_IMAGES[id as keyof typeof PROPERTY_IMAGES],
              imageAlt: `Professionals at ${property.location}`,
            })) ).map((card) => (
              <PropertyCard key={card.id} {...card} />
            ))}
          </div>
        </div>
      </section>

      <AboutSection />
      <PropertyManagementSection />
      <CustomerSuccessSection />
    </div>
  );
}
