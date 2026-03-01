'use client';

import { useEffect, useState, ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface InfoPageLayoutProps {
  title?: string;
  description?: string;
  titleAlign?: 'left' | 'center';
  children: ReactNode;
}

export default function InfoPageLayout({ title, description, titleAlign = 'center', children }: InfoPageLayoutProps) {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDates, setSelectedDates] = useState('');
  const [selectedGuests, setSelectedGuests] = useState(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header
        selectedLocation={selectedLocation}
        selectedDates={selectedDates}
        selectedGuests={selectedGuests}
        selectedPropertyId={selectedPropertyId}
        onLocationChange={(location, propertyId) => {
          setSelectedLocation(location);
          setSelectedPropertyId(propertyId);
        }}
        onDatesChange={setSelectedDates}
        onGuestsChange={setSelectedGuests}
        isScrolled={isScrolled}
      />

      <main className="pt-24 sm:pt-28">
        {(title || description) && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className={titleAlign === 'left' ? 'text-left' : 'text-center'}>
              {title ? (
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p
                  className={`text-lg text-gray-600 max-w-3xl ${
                    titleAlign === 'left' ? '' : 'mx-auto'
                  }`}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        )}
        {children}
      </main>

      <Footer />
    </div>
  );
}
