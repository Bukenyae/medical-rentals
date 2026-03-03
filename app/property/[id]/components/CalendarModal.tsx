'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarModalProps {
  showCalendar: boolean;
  onClose: () => void;
  calendarMode: 'checkin' | 'checkout';
  onApply: (checkIn: Date, checkOut: Date) => void;
  onReset: () => void;
  selectedCheckIn: Date | null;
  selectedCheckOut: Date | null;
  unavailableDates?: string[]; // list of YYYY-MM-DD ISO dates in UTC
}

export default function CalendarModal({
  showCalendar,
  onClose,
  calendarMode,
  onApply,
  onReset,
  selectedCheckIn,
  selectedCheckOut,
  unavailableDates = []
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeField, setActiveField] = useState<'checkin' | 'checkout'>(calendarMode);
  const [draftCheckIn, setDraftCheckIn] = useState<Date | null>(selectedCheckIn);
  const [draftCheckOut, setDraftCheckOut] = useState<Date | null>(selectedCheckOut);
  const blocked = new Set(unavailableDates);

  useEffect(() => {
    if (!showCalendar) return;
    setActiveField(calendarMode);
    setDraftCheckIn(selectedCheckIn);
    setDraftCheckOut(selectedCheckOut);
  }, [showCalendar, calendarMode, selectedCheckIn, selectedCheckOut]);

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
      
      // Normalize to UTC date string YYYY-MM-DD to match DB rows
      const isoUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        .toISOString()
        .slice(0, 10);

      days.push({
        date: new Date(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === monthIndex,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        formatted: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
        isoUtc,
        isBlocked: blocked.has(isoUtc),
      });
    }
    return days;
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

  const calendarDays = generateCalendarDays(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!showCalendar) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="calendar-card flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="overflow-y-auto p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeField === 'checkin' ? 'Select check-in date' : 'Select check-out date'}
            </h3>
            <button 
              onClick={onClose}
              aria-label="Close calendar"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigateMonth('prev')}
              aria-label="Previous month"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-medium text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button 
              onClick={() => navigateMonth('next')}
              aria-label="Next month"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isSelected = 
                (draftCheckIn && day.date.getTime() === draftCheckIn.getTime()) ||
                (draftCheckOut && day.date.getTime() === draftCheckOut.getTime());
              
              const isInRange = draftCheckIn && draftCheckOut &&
                day.date > draftCheckIn && day.date < draftCheckOut;
              
              const isDisabled = Boolean(
                day.isPast ||
                day.isBlocked ||
                (activeField === 'checkout' && draftCheckIn && day.date <= draftCheckIn)
              );

              return (
                <button
                  key={index}
                  onClick={() => {
                    if (isDisabled) return;
                    if (activeField === 'checkin') {
                      setDraftCheckIn(day.date);
                      if (draftCheckOut && day.date >= draftCheckOut) {
                        setDraftCheckOut(null);
                      }
                      setActiveField('checkout');
                      return;
                    }

                    if (!draftCheckIn || day.date <= draftCheckIn) {
                      setDraftCheckIn(day.date);
                      setDraftCheckOut(null);
                      setActiveField('checkout');
                      return;
                    }

                    setDraftCheckOut(day.date);
                  }}
                  disabled={isDisabled}
                  className={`
                    w-10 h-10 text-sm rounded-lg transition-colors relative
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isInRange
                        ? 'bg-blue-100 text-blue-900'
                        : day.isToday
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : day.isCurrentMonth
                        ? `${day.isBlocked ? 'text-gray-400 bg-gray-50' : 'text-gray-900 hover:bg-gray-100'}`
                        : 'text-gray-300'
                    }
                    ${
                      isDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    }
                  `}
                  aria-label={day.isBlocked ? `${day.formatted} unavailable` : day.formatted}
                >
                  {day.day}
                  {day.isToday && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p>Check-in: {draftCheckIn ? draftCheckIn.toLocaleDateString('en-US') : 'Select date'}</p>
                <p className="mt-1">Check-out: {draftCheckOut ? draftCheckOut.toLocaleDateString('en-US') : 'Select date'}</p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDraftCheckIn(null);
                    setDraftCheckOut(null);
                    setActiveField('checkin');
                    onReset();
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!draftCheckIn || !draftCheckOut}
                  onClick={() => {
                    if (!draftCheckIn || !draftCheckOut) return;
                    onApply(draftCheckIn, draftCheckOut);
                    onClose();
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
