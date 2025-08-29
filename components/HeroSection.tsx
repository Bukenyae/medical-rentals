'use client';

import Image from 'next/image';
import SearchBar from './SearchBar';

interface HeroSectionProps {
  selectedLocation: string;
  selectedDates: string;
  selectedGuests: number;
  selectedPropertyId: string;
  onLocationChange: (location: string, propertyId: string) => void;
  onDatesChange: (dates: string) => void;
  onGuestsChange: (guests: number) => void;
}

export default function HeroSection({
  selectedLocation,
  selectedDates,
  selectedGuests,
  selectedPropertyId,
  onLocationChange,
  onDatesChange,
  onGuestsChange
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[40vh] sm:h-[40vh] flex items-end justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6 sm:pb-8 bg-white">
      {/* Content */}
      <div className="relative z-10 text-center max-w-6xl mx-auto w-full">

        {/* Social Proof: Constrained to match SearchBar width */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 w-full">
            <div className="hidden lg:flex -space-x-3 flex-shrink-0">
              {[
                { src: "/images/Reviewers/Dr. Angelica Celestine.jpg", alt: "Dr. Angelica Celestine" },
                { src: "/images/Reviewers/Dr. Nia Jenkins.jpg", alt: "Dr. Nia Jenkins" },
                { src: "/images/Reviewers/Erica Rogers.NP.jpg", alt: "Erica Rogers NP" },
                { src: "/images/Reviewers/Marley Aguillard.NP.jpg", alt: "Marley Aguillard NP" }
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

        {/* Search Bar */}
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
    </section>
  );
}
