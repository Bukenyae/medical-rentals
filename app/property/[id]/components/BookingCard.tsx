'use client';

import { useState, useEffect } from 'react';
import { Star, Calendar, Minus, Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import AuthModal from '@/components/AuthModal';

interface BookingCardProps {
  property: {
    price: number;
    rating: number;
    reviewCount: number;
  };
  onOpenCalendar: (mode: 'checkin' | 'checkout') => void;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  onGuestChange: (increment: boolean) => void;
  nights: number;
  user: User | null;
}

export default function BookingCard({
  property,
  onOpenCalendar,
  checkInDate,
  checkOutDate,
  guests,
  onGuestChange,
  nights,
  user
}: BookingCardProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Calculate pricing components
  const basePrice = property.price * nights * guests;
  const cleaningFee = 25;
  const serviceFee = 36;
  const taxFee = Math.round((basePrice + cleaningFee + serviceFee) * 0.08);
  const totalPrice = basePrice + cleaningFee + serviceFee + taxFee;

  // Handle Reserve button click
  const handleReserve = () => {
    if (!user) {
      // Show auth modal if user is not authenticated
      setShowAuthModal(true);
    } else {
      // TODO: Implement reservation flow for authenticated users
      // This could redirect to a checkout page or open a payment modal
      console.log('Processing reservation for authenticated user:', user.email);
      alert(`Reservation processing for ${user.email}. Payment integration coming soon!`);
    }
  };

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24">
        <div className="border border-gray-200 rounded-xl p-6 shadow-lg booking-card">
          <div className="flex items-center justify-between mb-6">
            <div className="text-2xl font-semibold">
              ${property.price}<span className="text-base font-normal text-gray-500">/night</span>
            </div>
            <div className="flex items-center text-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
              <span className="font-medium">{property.rating}</span>
              <span className="text-gray-500 ml-1">({property.reviewCount})</span>
            </div>
          </div>

          {/* Date Selection */}
          <div className="border border-gray-300 rounded-lg mb-4">
            <div className="grid grid-cols-2">
              {/* Check-in Date */}
              <div className="p-3 border-r border-gray-300">
                <div className="text-xs font-semibold text-gray-900 uppercase">Check-in</div>
                <button 
                  onClick={() => onOpenCalendar('checkin')}
                  className="flex items-center justify-between w-full text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{checkInDate || 'Add date'}</span>
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
              
              {/* Check-out Date */}
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-900 uppercase">Checkout</div>
                <button 
                  onClick={() => onOpenCalendar('checkout')}
                  className="flex items-center justify-between w-full text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{checkOutDate || 'Add date'}</span>
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Guests Selection */}
            <div className="p-3 border-t border-gray-300">
              <div className="text-xs font-semibold text-gray-900 uppercase mb-2">Guests</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => onGuestChange(false)}
                    disabled={guests <= 1}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{guests}</span>
                  <button 
                    onClick={() => onGuestChange(true)}
                    disabled={guests >= 8}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-700">${property.price} x {nights} {nights === 1 ? 'night' : 'nights'} x {guests} {guests === 1 ? 'guest' : 'guests'}</span>
              <span className="text-gray-900">${basePrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Cleaning fee</span>
              <span className="text-gray-900">${cleaningFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Service fee</span>
              <span className="text-gray-900">${serviceFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Tax fee (8%)</span>
              <span className="text-gray-900">${taxFee}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mb-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${totalPrice}</span>
              </div>
            </div>
          </div>

          {/* Reserve Button */}
          <button 
            onClick={handleReserve}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg transition-all mb-4"
          >
            {user ? 'Reserve' : 'Sign in to Reserve'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            {user ? 'You won\'t be charged yet' : 'Please sign in to complete your reservation securely'}
          </p>
        </div>

        {/* Report Listing */}
        <div className="mt-6 text-center">
          <button className="flex items-center text-gray-600 hover:text-gray-900 underline mx-auto">
            <span className="w-4 h-4 mr-1">🚩</span>
            Report this listing
          </button>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}
