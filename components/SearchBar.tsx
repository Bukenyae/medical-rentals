'use client';

import { useMemo, useState } from 'react';
import { MapPin, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LocationOption {
  name: string;
  address: string;
  propertyId: string;
}

interface SearchBarProps {
  selectedLocation: string;
  selectedDates: string;
  selectedGuests: number;
  selectedPropertyId: string;
  onLocationChange: (location: string, propertyId: string) => void;
  onDatesChange: (dates: string) => void;
  onGuestsChange: (guests: number) => void;
  variant?: 'hero' | 'sticky';
  showBookButton?: boolean;
  locationOptions?: LocationOption[];
}

export default function SearchBar({
  selectedLocation,
  selectedDates,
  selectedGuests,
  selectedPropertyId,
  onLocationChange,
  onDatesChange,
  onGuestsChange,
  variant = 'hero',
  showBookButton = false,
  locationOptions = []
}: SearchBarProps) {
  const router = useRouter();
  const [calendarMode, setCalendarMode] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const isHero = variant === 'hero';
  const fallbackPropertyId = locationOptions.length === 1 ? locationOptions[0].propertyId : '';
  const destinationPropertyId = selectedPropertyId || fallbackPropertyId;

  const handleBookNow = () => {
    if (!destinationPropertyId) return;
    router.push(`/property/${destinationPropertyId}`);
  };
  const handleDateSelect = (date: Date) => {
    if (calendarMode === 'checkin') {
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
      setCalendarMode('checkout');
    } else {
      setSelectedCheckOut(date);
      // Format the date range for display
      if (selectedCheckIn) {
        const checkInStr = selectedCheckIn.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const checkOutStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
        onDatesChange(`${checkInStr} - ${checkOutStr}`);
      }
      setCalendarMode('checkin');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      days.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === monthIndex,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const locations = useMemo(() => {
    const unique = new Map<string, LocationOption>();
    for (const option of locationOptions) {
      const key = option.propertyId || option.address.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, option);
    }
    return Array.from(unique.values());
  }, [locationOptions]);

  if (isHero) {
    return (
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-white rounded-2xl shadow-2xl p-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Location Dropdown */}
            <div className="relative group">
              <div className="flex items-center p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedLocation || 'Location'}
                  </div>
                </div>
              </div>
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1">
                <div className="p-2">
                  {locations.map((location) => (
                    <div
                      key={location.propertyId}
                      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer text-sm"
                      onClick={() => onLocationChange(location.address, location.propertyId)}
                    >
                      <div className="font-medium text-gray-900">{location.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dates Dropdown */}
            <div className="relative group">
              <div className="flex items-center p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedDates || 'Check-in - Check-out'}
                  </div>
                </div>
              </div>
              <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1 w-80">
                <div className="p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {calendarMode === 'checkin' ? 'Select check-in date' : 'Select check-out date'}
                    </h4>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Previous month"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-medium text-gray-900">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button 
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Next month"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isSelected = 
                        (calendarMode === 'checkin' && selectedCheckIn && day.date.getTime() === selectedCheckIn.getTime()) ||
                        (calendarMode === 'checkout' && selectedCheckOut && day.date.getTime() === selectedCheckOut.getTime());
                      
                      const isInRange = selectedCheckIn && selectedCheckOut && 
                        day.date > selectedCheckIn && day.date < selectedCheckOut;
                      
                      const isDisabled =
                        day.isPast ||
                        (calendarMode === 'checkout' && selectedCheckIn !== null && day.date <= selectedCheckIn);

                      return (
                        <button
                          key={index}
                          onClick={() => !isDisabled && handleDateSelect(day.date)}
                          disabled={isDisabled}
                          className={`
                            w-8 h-8 text-xs rounded-lg transition-colors relative
                            ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : isInRange
                                ? 'bg-blue-100 text-blue-900'
                                : day.isToday
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : day.isCurrentMonth
                                ? 'text-gray-900 hover:bg-gray-100'
                                : 'text-gray-300'
                            }
                            ${
                              isDisabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            }
                          `}
                        >
                          {day.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 text-center">
                      {calendarMode === 'checkin' ? 'Check-in' : 'Check-out'}: 
                      {calendarMode === 'checkin' 
                        ? (selectedCheckIn ? selectedCheckIn.toLocaleDateString('en-US') : 'Select date')
                        : (selectedCheckOut ? selectedCheckOut.toLocaleDateString('en-US') : 'Select date')
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="relative group">
              <div className="flex items-center p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedGuests > 0 ? `${selectedGuests} guests` : 'Guests'}
                  </div>
                </div>
              </div>
              <div className="absolute top-full right-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1">
                <div className="p-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-900">Guests</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onGuestsChange(Math.max(1, selectedGuests - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                      >
                        <span className="text-gray-600">−</span>
                      </button>
                      <span className="text-sm font-medium text-gray-900 w-8 text-center">{selectedGuests}</span>
                      <button
                        onClick={() => onGuestsChange(selectedGuests + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                      >
                        <span className="text-gray-600">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Book Now Button */}
            <div className="flex items-center justify-center">
              <button
                onClick={handleBookNow}
                className="px-6 py-3 rounded-xl font-semibold text-[#8B1A1A] bg-[#F8F5F2] border border-[#8B1A1A] hover:bg-[#ede9e3] transition-all duration-300 w-full h-full cursor-pointer"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sticky header variant - Mobile Optimized
  return (
    <div className="flex-1 max-w-2xl">
      <div className="bg-gray-50 rounded-full border border-gray-200 p-1">
        <div className="flex items-center gap-1">
          <div className="grid grid-cols-3 gap-1 flex-1">
            {/* Location */}
            <div className="relative group">
              <div className="flex items-center px-2 sm:px-4 py-2 hover:bg-white rounded-full cursor-pointer transition-colors min-h-[40px]">
                <MapPin className="w-4 h-4 text-gray-400 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600 truncate">
                  {selectedLocation ? selectedLocation.split(',')[0] : 'Location'}
                </span>
              </div>
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1">
                <div className="p-2 max-h-60 overflow-y-auto">
                  {locations.map((location) => (
                    <div
                      key={location.propertyId}
                      className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer text-sm"
                      onClick={() => onLocationChange(location.address, location.propertyId)}
                    >
                      <div className="font-medium text-gray-900">{location.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="relative group">
              <div className="flex items-center px-2 sm:px-4 py-2 hover:bg-white rounded-full cursor-pointer transition-colors min-h-[40px]">
                <Calendar className="w-4 h-4 text-gray-400 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600 truncate">
                  {selectedDates || 'Dates'}
                </span>
              </div>
              <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1 w-80">
                <div className="p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {calendarMode === 'checkin' ? 'Select check-in' : 'Select check-out'}
                    </h4>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Previous month"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h4 className="text-sm font-medium text-gray-900">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button 
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Next month"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const isSelected = 
                        (calendarMode === 'checkin' && selectedCheckIn && day.date.getTime() === selectedCheckIn.getTime()) ||
                        (calendarMode === 'checkout' && selectedCheckOut && day.date.getTime() === selectedCheckOut.getTime());
                      
                      const isInRange = selectedCheckIn && selectedCheckOut && 
                        day.date > selectedCheckIn && day.date < selectedCheckOut;
                      
                      const isDisabled =
                        day.isPast ||
                        (calendarMode === 'checkout' && selectedCheckIn !== null && day.date <= selectedCheckIn);

                      return (
                        <button
                          key={index}
                          onClick={() => !isDisabled && handleDateSelect(day.date)}
                          disabled={isDisabled}
                          className={`
                            w-8 h-8 text-xs rounded-lg transition-colors relative
                            ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : isInRange
                                ? 'bg-blue-100 text-blue-900'
                                : day.isToday
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : day.isCurrentMonth
                                ? 'text-gray-900 hover:bg-gray-100'
                                : 'text-gray-300'
                            }
                            ${
                              isDisabled
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            }
                          `}
                        >
                          {day.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 text-center">
                      {calendarMode === 'checkin' ? 'Check-in' : 'Check-out'}: 
                      {calendarMode === 'checkin' 
                        ? (selectedCheckIn ? selectedCheckIn.toLocaleDateString('en-US') : 'Select date')
                        : (selectedCheckOut ? selectedCheckOut.toLocaleDateString('en-US') : 'Select date')
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="relative group">
              <div className="flex items-center px-2 sm:px-4 py-2 hover:bg-white rounded-full cursor-pointer transition-colors min-h-[40px]">
                <Users className="w-4 h-4 text-gray-400 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-gray-600 truncate">
                  {selectedGuests > 0 ? `${selectedGuests}` : 'Guests'}
                </span>
              </div>
              <div className="absolute top-full right-0 w-48 sm:w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 mt-1">
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-900">Guests</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onGuestsChange(Math.max(1, selectedGuests - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors touch-manipulation"
                      >
                        <span className="text-gray-600">−</span>
                      </button>
                      <span className="text-sm font-medium text-gray-900 w-8 text-center">{selectedGuests}</span>
                      <button
                        onClick={() => onGuestsChange(selectedGuests + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors touch-manipulation"
                      >
                        <span className="text-gray-600">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showBookButton && (
            <button
              onClick={handleBookNow}
              className="w-10 h-10 bg-[#8B1A1A] hover:bg-[#761717] text-[#F8F5F2] rounded-full transition-all duration-300 flex items-center justify-center touch-manipulation flex-shrink-0 ml-1"
              title="Search Properties"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
