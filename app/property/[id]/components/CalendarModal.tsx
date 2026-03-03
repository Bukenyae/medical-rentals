'use client';

import { useEffect, useState } from 'react';
import RangeCalendarModal from './RangeCalendarModal';

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
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (!showCalendar) return;
    setActiveField(calendarMode === 'checkin' ? 'start' : 'end');
  }, [showCalendar, calendarMode]);

  const toIsoUtc = (date: Date) =>
    new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .slice(0, 10);

  const fromIso = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <RangeCalendarModal
      show={showCalendar}
      activeField={activeField}
      startDate={selectedCheckIn ? toIsoUtc(selectedCheckIn) : ''}
      endDate={selectedCheckOut ? toIsoUtc(selectedCheckOut) : ''}
      blockedDates={unavailableDates}
      startFieldLabel="Check-in"
      endFieldLabel="Check-out"
      startTitle="Select check-in date"
      endTitle="Select check-out date"
      closeAriaLabel="Close calendar"
      onClose={onClose}
      onActiveFieldChange={setActiveField}
      onApply={(startDate, endDate) => onApply(fromIso(startDate), fromIso(endDate))}
      onReset={onReset}
    />
  );
}
