'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type RangeCalendarModalProps = {
  show: boolean;
  activeField: 'start' | 'end';
  startDate: string;
  endDate: string;
  allowSingleDayApply?: boolean;
  onClose: () => void;
  onActiveFieldChange: (field: 'start' | 'end') => void;
  onApply: (startDate: string, endDate: string) => void;
  onReset: () => void;
  blockedDates?: string[];
  startFieldLabel: string;
  endFieldLabel: string;
  startTitle: string;
  endTitle: string;
  closeAriaLabel: string;
};

type CalendarDay = {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
};

function dateToIsoUtc(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);
}

function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function buildCalendarDays(month: Date, blockedSet: Set<string>) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const todayIso = dateToIsoUtc(new Date());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const iso = dateToIsoUtc(current);
    days.push({
      iso,
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === monthIndex,
      isToday: iso === todayIso,
      isPast: iso < todayIso,
      isBlocked: blockedSet.has(iso),
    });
  }

  return days;
}

export default function RangeCalendarModal({
  show,
  activeField,
  startDate,
  endDate,
  allowSingleDayApply = false,
  onClose,
  onActiveFieldChange,
  onApply,
  onReset,
  blockedDates = [],
  startFieldLabel,
  endFieldLabel,
  startTitle,
  endTitle,
  closeAriaLabel,
}: RangeCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  useEffect(() => {
    if (!show) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    const seed = startDate || endDate;
    if (seed) {
      setCurrentMonth(parseIso(seed));
    }
  }, [show, startDate, endDate]);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const days = useMemo(() => buildCalendarDays(currentMonth, blockedSet), [currentMonth, blockedSet]);
  const resolvedEndDate = draftEnd || (allowSingleDayApply ? draftStart : '');
  const canApply = !!draftStart && !!resolvedEndDate;
  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="calendar-card flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="overflow-y-auto p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{activeField === 'start' ? startTitle : endTitle}</h3>
            <button type="button" onClick={onClose} aria-label={closeAriaLabel} className="text-gray-400 transition-colors hover:text-gray-600">
              ✕
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h4 className="text-lg font-medium text-gray-900">{monthLabel}</h4>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = day.iso === draftStart || day.iso === draftEnd;
              const isInRange = !!draftStart && !!draftEnd && day.iso > draftStart && day.iso < draftEnd;
              const isDisabled = day.isPast || day.isBlocked || (activeField === 'end' && !!draftStart && day.iso <= draftStart);

              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    if (activeField === 'start') {
                      setDraftStart(day.iso);
                      if (draftEnd && day.iso >= draftEnd) setDraftEnd('');
                      onActiveFieldChange('end');
                      return;
                    }

                    if (!draftStart || day.iso <= draftStart) {
                      setDraftStart(day.iso);
                      setDraftEnd('');
                      onActiveFieldChange('end');
                      return;
                    }

                    setDraftEnd(day.iso);
                  }}
                  disabled={isDisabled}
                  className={`relative h-10 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isInRange
                        ? 'bg-blue-100 text-blue-900'
                        : day.isToday
                          ? 'bg-blue-50 font-medium text-blue-600'
                          : day.isCurrentMonth
                            ? day.isBlocked
                              ? 'bg-gray-50 text-gray-400'
                              : 'text-gray-900 hover:bg-gray-100'
                            : 'text-gray-300'
                  } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  aria-label={day.isBlocked ? `${day.iso} unavailable` : `Select ${day.iso}`}
                >
                  {day.day}
                  {day.isToday && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-600" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p>
                  {startFieldLabel}: {draftStart || 'Select date'}
                </p>
                <p className="mt-1">
                  {endFieldLabel}: {resolvedEndDate || 'Select date'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setDraftStart('');
                    setDraftEnd('');
                    onActiveFieldChange('start');
                    onReset();
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={() => {
                    if (!draftStart || !resolvedEndDate) return;
                    onApply(draftStart, resolvedEndDate);
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
