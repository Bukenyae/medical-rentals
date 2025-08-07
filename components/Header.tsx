'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthButton from './AuthButton';
import SearchBar from './SearchBar';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  selectedLocation: string;
  selectedDates: string;
  selectedGuests: number;
  selectedPropertyId: string;
  onLocationChange: (location: string, propertyId: string) => void;
  onDatesChange: (dates: string) => void;
  onGuestsChange: (guests: number) => void;
}

export default function Header({
  selectedLocation,
  selectedDates,
  selectedGuests,
  selectedPropertyId,
  onLocationChange,
  onDatesChange,
  onGuestsChange
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  return (
    <>
      {/* Main Header - Mobile Optimized */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/images/logo/BR%20Logo.png"
                alt="Belle Rouge Properties logo"
                width={32}
                height={32}
                className="h-6 w-6 sm:h-8 sm:w-8"
              />
              <span className="hidden sm:block text-lg sm:text-2xl font-bold text-black truncate">Belle Rouge Properties</span>
            </Link>
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      {/* Sticky Header - Mobile Optimized */}
      <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
              <Link href="/" className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <Image
                  src="/images/logo/BR%20Logo.png"
                  alt="Belle Rouge Properties logo"
                  width={24}
                  height={24}
                  className="h-5 w-5 sm:h-6 sm:w-6"
                />
                <span className="hidden sm:block text-sm sm:text-lg font-bold text-gray-900">Belle Rouge Properties</span>
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
