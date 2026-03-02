import { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookingCardProperty, EventQuote } from './types';

const MIN_EVENT_DURATION_HOURS = 2;

type DayOverride = {
  date: string;
  startTime: string;
  endTime: string;
};

function parseLocalDateTime(dateValue: string, timeValue: string, addDay = 0) {
  if (!dateValue || !timeValue) return null;
  const [yearStr, monthStr, dayStr] = dateValue.split('-');
  const [hourStr, minuteStr] = timeValue.split(':');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if ([year, month, day, hour, minute].some((n) => !Number.isFinite(n))) return null;
  return new Date(year, month - 1, day + addDay, hour, minute, 0, 0);
}

function parseTimeMinutes(value: string) {
  if (!value) return NaN;
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour * 60 + minute;
}

function enumerateSessionDates(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function sanitizeGuestFacingError(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes('supabase service role')) return 'Availability check is temporarily unavailable. Please try again shortly.';
  if (lowered.includes('service role')) return 'This action is temporarily unavailable. Please try again shortly.';
  if (lowered.includes('permission denied') || lowered.includes('unauthorized')) return 'You do not have permission to perform this action.';
  return message;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debounced;
}

type Params = {
  property: BookingCardProperty;
  propertyId: string;
  user: User | null;
  onRequireAuth: () => void;
};

export function useEventBookingFlow({ property, propertyId, user, onRequireAuth }: Params) {
  const [eventStep, setEventStep] = useState(1);
  const [eventGuests, setEventGuests] = useState(10);
  const [eventVehicles, setEventVehicles] = useState(0);
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [globalStartTime, setGlobalStartTime] = useState('07:00');
  const [globalEndTime, setGlobalEndTime] = useState('19:00');
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([]);
  const [overnightHold, setOvernightHold] = useState(false);
  const [requestScout, setRequestScout] = useState(false);
  const [scoutNotes, setScoutNotes] = useState('');
  const [eventType, setEventType] = useState('corporate');
  const [eventDescription, setEventDescription] = useState('');
  const [alcohol, setAlcohol] = useState(false);
  const [amplifiedSound, setAmplifiedSound] = useState(false);
  const [vendors, setVendors] = useState('');
  const [crewSize, setCrewSize] = useState('');
  const [equipmentScale, setEquipmentScale] = useState('');
  const [addonParking, setAddonParking] = useState(false);
  const [addonEarlyAccess, setAddonEarlyAccess] = useState(false);
  const [addonLateExtension, setAddonLateExtension] = useState(false);
  const [eventQuote, setEventQuote] = useState<EventQuote | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [pendingSubmitAfterAuth, setPendingSubmitAfterAuth] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxEventGuests = property.maxEventGuests ?? 20;
  const baseParkingCapacity = property.baseParkingCapacity ?? 8;
  const timezone = property.timezone ?? 'America/Chicago';
  const hourlyRateCents = property.eventHourlyFromCents ?? 12500;
  const multiDayDiscountPct = property.eventMultiDayDiscountPct ?? 0;
  const overnightHoldingPct = property.eventOvernightHoldingPct ?? 25;
  const eventAddonsTotalCents = (addonParking ? 3500 : 0) + (addonEarlyAccess ? 5000 : 0) + (addonLateExtension ? 6500 : 0);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sessionDates = useMemo(() => enumerateSessionDates(eventStartDate, eventEndDate), [eventStartDate, eventEndDate]);

  const overrideMap = useMemo(() => {
    const map = new Map<string, DayOverride>();
    dayOverrides.forEach((override) => map.set(override.date, override));
    return map;
  }, [dayOverrides]);

  const sessionWindows = useMemo(() => sessionDates.map((date) => {
    const override = overrideMap.get(date);
    const startTime = override?.startTime || globalStartTime;
    const endTime = override?.endTime || globalEndTime;
    const startMinutes = parseTimeMinutes(startTime);
    const endMinutes = parseTimeMinutes(endTime);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
      return { date, startTime, endTime, durationHours: 0, endsNextDay: false, endMinutes: Number.NaN };
    }
    const endsNextDay = endMinutes <= startMinutes;
    const adjustedEndMinutes = endsNextDay ? endMinutes + 24 * 60 : endMinutes;
    const durationHours = (adjustedEndMinutes - startMinutes) / 60;
    return { date, startTime, endTime, durationHours, endsNextDay, endMinutes };
  }), [sessionDates, overrideMap, globalStartTime, globalEndTime]);

  const eventDurationHours = useMemo(
    () => sessionWindows.reduce((sum, day) => sum + Math.max(0, day.durationHours), 0),
    [sessionWindows]
  );

  const latestEndMinutes = useMemo(
    () => sessionWindows.reduce((max, day) => (Number.isFinite(day.endMinutes) && day.endMinutes > max ? day.endMinutes : max), Number.NaN),
    [sessionWindows]
  );

  const endsAfterCurfew = useMemo(() => {
    if (!property.eventCurfewTime || !Number.isFinite(latestEndMinutes)) return false;
    const curfewMinutes = parseTimeMinutes(property.eventCurfewTime);
    return Number.isFinite(curfewMinutes) ? latestEndMinutes > curfewMinutes : false;
  }, [property.eventCurfewTime, latestEndMinutes]);

  const firstSessionDay = sessionDates[0] || '';
  const lastSessionDay = sessionDates[sessionDates.length - 1] || '';
  const firstStartDateTime = useMemo(() => parseLocalDateTime(firstSessionDay, globalStartTime), [firstSessionDay, globalStartTime]);
  const lastWindow = sessionWindows[sessionWindows.length - 1];
  const lastEndDateTime = useMemo(() => {
    if (!lastSessionDay || !lastWindow) return null;
    return parseLocalDateTime(lastSessionDay, lastWindow.endTime, lastWindow.endsNextDay ? 1 : 0);
  }, [lastSessionDay, lastWindow]);

  const eventStartAt = firstStartDateTime ? `${firstSessionDay}T${globalStartTime}:00` : '';
  const eventEndAt = lastEndDateTime ? `${lastSessionDay}T${lastWindow?.endTime || globalEndTime}:00` : '';
  const availabilityUnknown = !!availabilityError && isAvailable === null;
  const debouncedQuoteInputs = useDebouncedValue(
    useMemo(() => ({
      eventStartDate,
      eventEndDate,
      globalStartTime,
      globalEndTime,
      dayOverrides,
      overnightHold,
      eventType,
      eventStartAt,
      eventEndAt,
      eventGuests,
      eventVehicles,
      multiDayDiscountPct,
      overnightHoldingPct,
      hourlyRateCents,
      eventAddonsTotalCents,
      curfewTime: property.eventCurfewTime,
      allowInstantBook: !!property.eventInstantBookEnabled,
      propertyId,
      alcohol,
      amplifiedSound,
    }), [eventStartDate, eventEndDate, globalStartTime, globalEndTime, dayOverrides, overnightHold, eventType, eventStartAt, eventEndAt, eventGuests, eventVehicles, multiDayDiscountPct, overnightHoldingPct, hourlyRateCents, eventAddonsTotalCents, property.eventCurfewTime, property.eventInstantBookEnabled, propertyId, alcohol, amplifiedSound]),
    220
  );
  const debouncedAvailabilityInputs = useDebouncedValue(
    useMemo(() => ({ eventStartDate, eventEndDate, eventStartAt, eventEndAt, propertyId }), [eventStartDate, eventEndDate, eventStartAt, eventEndAt, propertyId]),
    220
  );

  const stepOneValidation = useCallback(() => {
    if (!eventStartDate || !eventEndDate) return 'Session start and end dates are required.';
    if (eventStartDate < todayIso) return 'Session start date cannot be in the past.';
    if (eventEndDate < eventStartDate) return 'Session end date must be on or after start date.';
    if (!globalStartTime || !globalEndTime) return 'Global start and end times are required.';
    if (sessionDates.length === 0) return 'Select a valid date range.';
    if (sessionWindows.some((day) => day.durationHours <= 0)) return 'Each selected day must have a valid time window.';
    if (eventDurationHours < MIN_EVENT_DURATION_HOURS) return `Event duration must be at least ${MIN_EVENT_DURATION_HOURS} hours.`;
    if (eventGuests < 1) return 'Guest count must be at least 1.';
    if (eventGuests > maxEventGuests) return `Guest count cannot exceed ${maxEventGuests}.`;
    if (eventVehicles < 0) return 'Vehicle count cannot be negative.';
    if (isAvailable === false) return 'This time slot is unavailable. Choose another time.';
    if (availabilityUnknown) return 'Availability could not be verified. Please retry before continuing.';
    return null;
  }, [eventStartDate, eventEndDate, todayIso, globalStartTime, globalEndTime, sessionDates.length, sessionWindows, eventDurationHours, eventGuests, maxEventGuests, eventVehicles, isAvailable, availabilityUnknown]);

  const availabilityPrereqError = useMemo(() => {
    if (!eventStartDate || !eventEndDate) return 'Session start and end dates are required.';
    if (eventStartDate < todayIso) return 'Session start date cannot be in the past.';
    if (eventEndDate < eventStartDate) return 'Session end date must be on or after start date.';
    if (!globalStartTime || !globalEndTime) return 'Global start and end times are required.';
    if (sessionDates.length === 0) return 'Select a valid date range.';
    if (sessionWindows.some((day) => day.durationHours <= 0)) return 'Each selected day must have a valid time window.';
    if (eventDurationHours < MIN_EVENT_DURATION_HOURS) return `Event duration must be at least ${MIN_EVENT_DURATION_HOURS} hours.`;
    if (eventGuests < 1 || eventGuests > maxEventGuests) return 'Guest count is out of range.';
    if (eventVehicles < 0) return 'Vehicle count cannot be negative.';
    return null;
  }, [eventStartDate, eventEndDate, todayIso, globalStartTime, globalEndTime, sessionDates.length, sessionWindows, eventDurationHours, eventGuests, maxEventGuests, eventVehicles]);

  const stepThreeValidation = useCallback(() => {
    if (!eventDescription.trim()) return 'Event description is required.';
    if (!vendors.trim()) return 'Vendor list is required. Enter vendor names or type "None".';
    if (eventType === 'production' && (!crewSize.trim() || !equipmentScale.trim())) return 'Production events require crew size and equipment scale.';
    return null;
  }, [eventDescription, vendors, eventType, crewSize, equipmentScale]);

  useEffect(() => {
    if (!debouncedQuoteInputs.eventStartDate || !debouncedQuoteInputs.eventEndDate) return;
    let isActive = true;
    const controller = new AbortController();

    void fetch('/api/bookings/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        kind: 'event',
        propertyId: debouncedQuoteInputs.propertyId,
        eventType: debouncedQuoteInputs.eventType,
        startAt: debouncedQuoteInputs.eventStartAt,
        endAt: debouncedQuoteInputs.eventEndAt,
        startDate: debouncedQuoteInputs.eventStartDate,
        endDate: debouncedQuoteInputs.eventEndDate,
        globalStartTime: debouncedQuoteInputs.globalStartTime,
        globalEndTime: debouncedQuoteInputs.globalEndTime,
        dayOverrides: debouncedQuoteInputs.dayOverrides,
        overnightHold: debouncedQuoteInputs.overnightHold,
        overnightHoldingPct: debouncedQuoteInputs.overnightHoldingPct,
        multiDayDiscountPct: debouncedQuoteInputs.multiDayDiscountPct,
        guestCount: debouncedQuoteInputs.eventGuests,
        estimatedVehicles: debouncedQuoteInputs.eventVehicles,
        hourlyRateCents: debouncedQuoteInputs.hourlyRateCents,
        minHours: 4,
        dayRateHours: 8,
        cleaningFeeCents: 25000,
        depositCents: 75000,
        addonsTotalCents: debouncedQuoteInputs.eventAddonsTotalCents,
        allowInstantBook: debouncedQuoteInputs.allowInstantBook,
        curfewTime: debouncedQuoteInputs.curfewTime,
        alcohol: debouncedQuoteInputs.alcohol,
        amplifiedSound: debouncedQuoteInputs.amplifiedSound,
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Unable to quote event');
        if (isActive) setEventQuote(json.quote as EventQuote);
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Unable to quote event';
        setEventError(sanitizeGuestFacingError(message));
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [debouncedQuoteInputs]);

  useEffect(() => {
    if (availabilityPrereqError) {
      setIsAvailable(null);
      setAvailabilityError(null);
      return;
    }
    if (!debouncedAvailabilityInputs.eventStartDate || !debouncedAvailabilityInputs.eventEndDate || !debouncedAvailabilityInputs.eventStartAt || !debouncedAvailabilityInputs.eventEndAt || !debouncedAvailabilityInputs.propertyId) return;

    let isActive = true;
    const controller = new AbortController();
    void fetch('/api/bookings/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        propertyId: debouncedAvailabilityInputs.propertyId,
        startAt: debouncedAvailabilityInputs.eventStartAt,
        endAt: debouncedAvailabilityInputs.eventEndAt,
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Unable to check availability');
        if (!isActive) return;
        setIsAvailable(!!json.available);
        setAvailabilityError(json.available ? null : 'Selected time overlaps an existing booking.');
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsAvailable(null);
        const message = err instanceof Error ? err.message : 'Unable to check availability';
        setAvailabilityError(sanitizeGuestFacingError(message));
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [debouncedAvailabilityInputs, availabilityPrereqError]);

  const submitEventBooking = useCallback(async () => {
    if (!user) {
      setPendingSubmitAfterAuth(true);
      onRequireAuth();
      return;
    }

    const stepOneError = stepOneValidation();
    if (stepOneError) return setEventError(stepOneError);
    const stepThreeError = stepThreeValidation();
    if (stepThreeError) return setEventError(stepThreeError);
    if (!eventQuote) return setEventError('Event quote unavailable. Adjust inputs and try again.');
    if (availabilityUnknown) return setEventError('Availability could not be verified. Please retry before submitting.');

    setEventError(null);
    setEventSuccess(null);
    setSubmittedBookingId(null);
    setIsSubmitting(true);

    try {
      const draftRes = await fetch('/api/bookings/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        kind: 'event', propertyId, guestCount: eventGuests, startAt: eventStartAt, endAt: eventEndAt, mode: eventQuote.mode, quote: eventQuote,
        eventDetails: {
          eventType,
          estimatedVehicleCount: eventVehicles,
          alcohol,
          amplifiedSound,
          eventDescription,
          vendors: vendors.split(',').map((v) => v.trim()).filter(Boolean),
          productionDetails: {
            ...(eventType === 'production' ? { crewSize, equipmentScale } : {}),
            session: {
              startDate: eventStartDate,
              endDate: eventEndDate,
              globalStartTime,
              globalEndTime,
              dayOverrides,
              overnightHold,
              requestScout,
              scoutNotes,
            },
          },
        },
      }) });
      const draftJson = await draftRes.json();
      if (!draftRes.ok || !draftJson?.booking?.id) throw new Error(draftJson?.error || 'Failed to create booking draft');

      const submitRes = await fetch('/api/bookings/submit-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: draftJson.booking.id, kind: 'event', quote: eventQuote }) });
      const submitJson = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitJson?.error || 'Failed to submit booking request');

      const bookingId = submitJson?.booking?.id || draftJson?.booking?.id || null;
      const mode = submitJson?.booking?.mode || eventQuote.mode;
      setSubmittedBookingId(bookingId);
      setEventSuccess(mode === 'instant' ? 'Instant booking created. Complete payment and deposit authorization to confirm.' : 'Request submitted. Host review window is up to 48 business hours.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit booking request';
      setEventError(sanitizeGuestFacingError(message));
    } finally {
      setIsSubmitting(false);
    }
  }, [user, onRequireAuth, stepOneValidation, stepThreeValidation, eventQuote, availabilityUnknown, propertyId, eventGuests, eventStartAt, eventEndAt, eventType, eventVehicles, alcohol, amplifiedSound, eventDescription, vendors, crewSize, equipmentScale, eventStartDate, eventEndDate, globalStartTime, globalEndTime, dayOverrides, overnightHold, requestScout, scoutNotes]);

  useEffect(() => {
    if (!pendingSubmitAfterAuth || !user) return;
    setPendingSubmitAfterAuth(false);
    void submitEventBooking();
  }, [pendingSubmitAfterAuth, user, submitEventBooking]);

  const advanceStep = useCallback(() => {
    if (isSubmitting) return;
    if (eventStep === 1) {
      const err = stepOneValidation();
      if (err) {
        setEventError(err);
        return;
      }
    }
    if (eventStep < 3) {
      setEventError(null);
      setEventStep((prev) => prev + 1);
      return;
    }
    void submitEventBooking();
  }, [isSubmitting, eventStep, stepOneValidation, submitEventBooking]);

  const setDayOverride = useCallback((date: string, field: 'startTime' | 'endTime', value: string) => {
    setDayOverrides((previous) => {
      const existing = previous.find((item) => item.date === date);
      if (!existing) {
        return [...previous, { date, startTime: field === 'startTime' ? value : globalStartTime, endTime: field === 'endTime' ? value : globalEndTime }];
      }
      return previous.map((item) => (item.date === date ? { ...item, [field]: value } : item));
    });
  }, [globalStartTime, globalEndTime]);

  const clearDayOverride = useCallback((date: string) => {
    setDayOverrides((previous) => previous.filter((item) => item.date !== date));
  }, []);

  return {
    state: {
      eventStep, eventStartDate, eventEndDate, globalStartTime, globalEndTime, sessionDates, dayOverrides,
      overnightHold, requestScout, scoutNotes, eventGuests, eventVehicles, eventType, eventDescription, alcohol,
      amplifiedSound, vendors, crewSize, equipmentScale, addonParking, addonEarlyAccess, addonLateExtension,
      eventQuote, eventError, eventSuccess, submittedBookingId, isSubmitting, availabilityError,
    },
    derived: {
      todayIso, maxEventGuests, baseParkingCapacity, timezone, hourlyRateCents, eventDurationHours,
      endsAfterCurfew, availabilityUnknown, isAvailable, multiDayDiscountPct, overnightHoldingPct,
    },
    actions: {
      setEventStep, setEventStartDate, setEventEndDate, setGlobalStartTime, setGlobalEndTime, setDayOverride,
      clearDayOverride, setOvernightHold, setRequestScout, setScoutNotes, setEventGuests, setEventVehicles, setEventType,
      setEventDescription, setAlcohol, setAmplifiedSound, setVendors, setCrewSize, setEquipmentScale,
      setAddonParking, setAddonEarlyAccess, setAddonLateExtension,
      stepOneValidation, submitEventBooking, advanceStep,
    },
  };
}
