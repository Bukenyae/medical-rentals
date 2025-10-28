'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthButton from './AuthButton';
import SearchBar from './SearchBar';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import useAuthUser from '@/hooks/useAuthUser';

interface HeaderProps {
  selectedLocation: string;
  selectedDates: string;
  selectedGuests: number;
  selectedPropertyId: string;
  onLocationChange: (location: string, propertyId: string) => void;
  onDatesChange: (dates: string) => void;
  onGuestsChange: (guests: number) => void;
  isScrolled: boolean;
}

export default function Header({
  selectedLocation,
  selectedDates,
  selectedGuests,
  selectedPropertyId,
  onLocationChange,
  onDatesChange,
  onGuestsChange,
  isScrolled,
}: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  const { user: authUser } = useAuthUser();
  useEffect(() => {
    setUser(authUser);
  }, [authUser]);

  return (
    <>
      {/* Main Header - Mobile Optimized */}
      <header className={`absolute top-0 left-0 right-0 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300 z-20 bg-white`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/logo/BelleRougeLogo.png"
                alt="Belle Rouge Properties logo"
                width={1168}
                height={283}
                priority
                quality={100}
                className="h-8 w-auto sm:h-10 filter saturate-150 contrast-125"
              />
              <h1 className="sr-only">Belle Rouge Properties</h1>
            </Link>
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* Sticky Header - Mobile Optimized */}
      <div className={`fixed top-0 left-0 right-0 z-[70] bg-white backdrop-blur-0 transition-transform duration-300 ${
        isScrolled ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
            <div className="flex items-center justify-between py-3 sm:py-4 gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Image
                  src="/images/logo/BelleRougeLogo.png"
                  alt="Belle Rouge Properties logo"
                  width={1168}
                  height={283}
                  priority
                  quality={100}
                  className="h-8 w-auto sm:h-10 filter saturate-150 contrast-125"
                />
                <span className="sr-only">Belle Rouge Properties</span>
              </Link>
              
              <div className="flex-1 max-w-2xl mx-2 sm:mx-4">
                <SearchBar
                  selectedLocation={selectedLocation}
                  selectedDates={selectedDates}
                  selectedGuests={selectedGuests}
                  selectedPropertyId={selectedPropertyId}
                  onLocationChange={onLocationChange}
                  onDatesChange={onDatesChange}
                  onGuestsChange={onGuestsChange}
                  variant="sticky"
                  showBookButton={true}
                />
              </div>
              
              <div className="flex-shrink-0">
                <AuthButton user={user} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
