'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  show: boolean;
  activeField: 'start' | 'end';
  startDate: string;
  endDate: string;
  onClose: () => void;
  onActiveFieldChange: (field: 'start' | 'end') => void;
  onApply: (startDate: string, endDate: string) => void;
  onReset: () => void;
};

type CalendarDay = {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
  isPast: boolean;
};

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    current.setHours(0, 0, 0, 0);
    days.push({
      iso: toIso(current),
      day: current.getDate(),
      isCurrentMonth: current.getMonth() === monthIndex,
      isPast: current.getTime() < today.getTime(),
    });
  }
  return days;
}

export default function EventSessionCalendarModal({
  show,
  activeField,
  startDate,
  endDate,
  onClose,
  onActiveFieldChange,
  onApply,
  onReset,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  const monthLabel = useMemo(
    () => currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [currentMonth]
  );
  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeField === 'start' ? 'Select session start date' : 'Select session end date'}
            </h3>
            <button type="button" onClick={onClose} aria-label="Close event session calendar" className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-lg p-2 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-base font-medium text-gray-900">{monthLabel}</p>
            <button type="button" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} aria-label="Next month" className="rounded-lg p-2 hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
              <span key={name} className="py-1">{name}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isStart = draftStart === day.iso;
              const isEnd = draftEnd === day.iso;
              const isInRange = !!draftStart && !!draftEnd && day.iso > draftStart && day.iso < draftEnd;
              const disabled = day.isPast;

              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (activeField === 'start') {
                      setDraftStart(day.iso);
                      if (draftEnd && draftEnd <= day.iso) setDraftEnd('');
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
                  className={`h-10 rounded-lg text-sm transition-colors ${
                    isStart || isEnd
                      ? 'bg-blue-600 text-white'
                      : isInRange
                        ? 'bg-blue-100 text-blue-900'
                        : day.isCurrentMonth
                          ? 'text-gray-900 hover:bg-gray-100'
                          : 'text-gray-300'
                  } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                  aria-label={`Select ${day.iso}`}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 p-3 text-xs text-gray-600">
            <p>Start: {draftStart || 'Select date'}</p>
            <p className="mt-1">End: {draftEnd || 'Select date'}</p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraftStart('');
                setDraftEnd('');
                onActiveFieldChange('start');
                onReset();
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!draftStart || !draftEnd}
              onClick={() => {
                if (!draftStart || !draftEnd) return;
                onApply(draftStart, draftEnd);
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
  );
}
