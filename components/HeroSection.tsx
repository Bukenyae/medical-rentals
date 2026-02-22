'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeroSectionProps {
  selectedLocation: string;
  selectedDates: string;
  selectedGuests: number;
  selectedPropertyId: string;
  onLocationChange: (location: string, propertyId: string) => void;
  onDatesChange: (dates: string) => void;
  onGuestsChange: (guests: number) => void;
  isScrolled: boolean;
}

export default function HeroSection({
  selectedLocation,
  selectedDates,
  selectedGuests,
  selectedPropertyId,
  onLocationChange,
  onDatesChange,
  onGuestsChange,
  isScrolled,
}: HeroSectionProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <section className="relative flex justify-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-8 bg-white mt-12 sm:mt-16">
      <div className="relative z-10 text-center max-w-6xl mx-auto w-full">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 w-full">
            <div className="hidden lg:flex -space-x-3 flex-shrink-0">
              {[
                { src: '/images/Reviewers/Dr. Angelica Celestine.jpg', alt: 'Dr. Angelica Celestine' },
                { src: '/images/Reviewers/Dr. Nia Jenkins.jpg', alt: 'Dr. Nia Jenkins' },
                { src: '/images/Reviewers/Erica Rogers.NP.jpg', alt: 'Erica Rogers NP' },
                { src: '/images/Reviewers/Marley Aguillard.NP.jpg', alt: 'Marley Aguillard NP' }
              ].map((reviewer, index) => (
                <div key={index} className="relative w-12 h-12 sm:w-16 sm:h-16">
                  <Image
                    src={reviewer.src}
                    alt={reviewer.alt}
                    width={64}
                    height={64}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-white shadow-lg object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="text-gray-900 sm:ml-6 w-full">
              <p className="text-[12px] font-semibold text-center sm:text-left leading-tight text-gray-900/60 sm:whitespace-nowrap">
                Trusted by 500+ medical staff, academics, military members, students, and young professionals.
              </p>
            </div>
          </div>
        </div>

        <div className={`md:hidden transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((prev) => !prev)}
            className="w-full max-w-4xl mx-auto rounded-full border border-gray-200 bg-white px-5 py-3 shadow-sm flex items-center justify-center gap-2 text-gray-800"
            aria-expanded={isMobileSearchOpen}
            aria-controls="mobile-booking-panel"
          >
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold">Search Belle Properties</span>
          </button>
        </div>

        {isMobileSearchOpen && (
          <div
            id="mobile-booking-panel"
            className={`md:hidden mt-3 transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700"
                aria-label="Close booking counter"
                title="Close booking counter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SearchBar
              selectedLocation={selectedLocation}
              selectedDates={selectedDates}
              selectedGuests={selectedGuests}
              selectedPropertyId={selectedPropertyId}
              onLocationChange={onLocationChange}
              onDatesChange={onDatesChange}
              onGuestsChange={onGuestsChange}
              variant="hero"
            />
          </div>
        )}

        <div className={`hidden md:block transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <SearchBar
            selectedLocation={selectedLocation}
            selectedDates={selectedDates}
            selectedGuests={selectedGuests}
            selectedPropertyId={selectedPropertyId}
            onLocationChange={onLocationChange}
            onDatesChange={onDatesChange}
            onGuestsChange={onGuestsChange}
            variant="hero"
          />
        </div>
      </div>
    </section>
  );
}
