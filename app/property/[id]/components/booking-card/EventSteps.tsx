import { useState } from 'react';
import EventSessionCalendarModal from './EventSessionCalendarModal';
import { AttendeePricingTier } from './types';

type StepOneProps = {
  todayIso: string;
  eventStartDate: string;
  eventEndDate: string;
  globalStartTime: string;
  globalEndTime: string;
  sessionDates: string[];
  dayOverrides: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
  overnightHold: boolean;
  requestScout: boolean;
  scoutNotes: string;
  maxEventGuests: number;
  attendeePricingTiers: AttendeePricingTier[];
  selectedAttendeeTier: AttendeePricingTier;
  eventVehicles: number;
  baseParkingCapacity: number;
  endsAfterCurfew: boolean;
  eventDurationHours: number;
  availabilityError: string | null;
  eventCurfewTime?: string | null;
  canExtendDay: boolean;
  hasExtendedDay: boolean;
  extendedDayDate: string;
  onEventStartDateChange: (value: string) => void;
  onEventEndDateChange: (value: string) => void;
  onGlobalStartTimeChange: (value: string) => void;
  onGlobalEndTimeChange: (value: string) => void;
  onSetDayOverride: (date: string, field: 'startTime' | 'endTime', value: string) => void;
  onClearDayOverride: (date: string) => void;
  onOvernightHoldChange: (value: boolean) => void;
  onRequestScoutChange: (value: boolean) => void;
  onScoutNotesChange: (value: string) => void;
  onEventGuestsChange: (value: number) => void;
  onEventVehiclesChange: (value: number) => void;
  onExtendDay: () => void;
  onRemoveExtendedDay: () => void;
};

export function EventStepOne({
  todayIso,
  eventStartDate,
  eventEndDate,
  globalStartTime,
  globalEndTime,
  sessionDates,
  dayOverrides,
  overnightHold,
  requestScout,
  scoutNotes,
  maxEventGuests,
  attendeePricingTiers,
  selectedAttendeeTier,
  eventVehicles,
  baseParkingCapacity,
  endsAfterCurfew,
  eventDurationHours,
  availabilityError,
  eventCurfewTime,
  canExtendDay,
  hasExtendedDay,
  extendedDayDate,
  onEventStartDateChange,
  onEventEndDateChange,
  onGlobalStartTimeChange,
  onGlobalEndTimeChange,
  onSetDayOverride,
  onClearDayOverride,
  onOvernightHoldChange,
  onRequestScoutChange,
  onScoutNotesChange,
  onEventGuestsChange,
  onEventVehiclesChange,
  onExtendDay,
  onRemoveExtendedDay,
}: StepOneProps) {
  const overrideMap = new Map(dayOverrides.map((override) => [override.date, override]));
  const [showSessionCalendar, setShowSessionCalendar] = useState(false);
  const [calendarField, setCalendarField] = useState<'start' | 'end'>('start');
  const extendedDayOverride = extendedDayDate ? overrideMap.get(extendedDayDate) : undefined;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Session dates</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setCalendarField('start');
              setShowSessionCalendar(true);
            }}
            className="rounded-md border p-2 text-left text-sm"
          >
            <p className="text-xs font-semibold text-gray-700">Start date</p>
            <p className="mt-1 text-gray-900">{eventStartDate || 'Select date'}</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setCalendarField('end');
              setShowSessionCalendar(true);
            }}
            className="rounded-md border p-2 text-left text-sm"
          >
            <p className="text-xs font-semibold text-gray-700">End date</p>
            <p className="mt-1 text-gray-900">{eventEndDate || 'Select date'}</p>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Use calendar mode for range selection, then tap Apply to confirm dates.</p>
      </div>

      <EventSessionCalendarModal
        show={showSessionCalendar}
        activeField={calendarField}
        startDate={eventStartDate}
        endDate={eventEndDate}
        onClose={() => setShowSessionCalendar(false)}
        onActiveFieldChange={setCalendarField}
        onApply={(start, end) => {
          onEventStartDateChange(start);
          onEventEndDateChange(end);
        }}
        onReset={() => {
          onEventStartDateChange('');
          onEventEndDateChange('');
        }}
      />

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Global daily time window</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-gray-700">
            Start time
            <input type="time" value={globalStartTime} onChange={(e) => onGlobalStartTimeChange(e.target.value)} className="mt-1 w-full rounded-md border p-2 text-sm" aria-label="Global start time" title="Global start time" />
          </label>
          <label className="text-xs font-semibold text-gray-700">
            End time
            <input type="time" value={globalEndTime} onChange={(e) => onGlobalEndTimeChange(e.target.value)} className="mt-1 w-full rounded-md border p-2 text-sm" aria-label="Global end time" title="Global end time" />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">For overnight shoots, set an end time earlier than the start time (e.g. 18:00 → 04:00).</p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onExtendDay}
            disabled={!canExtendDay || hasExtendedDay}
            className="font-medium text-[#8B1A1A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Extend a day
          </button>
          {hasExtendedDay && (
            <button
              type="button"
              onClick={onRemoveExtendedDay}
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {hasExtendedDay && extendedDayDate && (
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-900">Extended day</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-md border p-2 text-xs">
              <p className="font-semibold text-gray-700">Date</p>
              <p className="mt-1 text-sm text-gray-900">{extendedDayDate}</p>
            </div>
            <label className="text-xs font-semibold text-gray-700">
              Start time
              <input
                type="time"
                value={extendedDayOverride?.startTime || globalStartTime}
                onChange={(e) => onSetDayOverride(extendedDayDate, 'startTime', e.target.value)}
                className="mt-1 w-full rounded-md border p-2 text-sm"
                aria-label="Extended day start time"
                title="Extended day start time"
              />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              End time
              <input
                type="time"
                value={extendedDayOverride?.endTime || globalEndTime}
                onChange={(e) => onSetDayOverride(extendedDayDate, 'endTime', e.target.value)}
                className="mt-1 w-full rounded-md border p-2 text-sm"
                aria-label="Extended day end time"
                title="Extended day end time"
              />
            </label>
          </div>
        </div>
      )}

      {sessionDates.length > 1 && (
        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">Advanced per-day overrides</summary>
          <p className="mt-2 text-xs text-gray-600">Override specific days for custom call times (e.g., night shoot).</p>
          <div className="mt-2 space-y-2">
            {sessionDates.map((date) => {
              const override = overrideMap.get(date);
              return (
                <div key={date} className="grid grid-cols-[1fr,1fr,1fr,auto] items-end gap-2">
                  <p className="text-xs font-medium text-gray-700">{date}</p>
                  <input
                    type="time"
                    value={override?.startTime || globalStartTime}
                    onChange={(e) => onSetDayOverride(date, 'startTime', e.target.value)}
                    className="rounded-md border p-2 text-sm"
                    aria-label={`Override start time for ${date}`}
                    title={`Override start time for ${date}`}
                  />
                  <input
                    type="time"
                    value={override?.endTime || globalEndTime}
                    onChange={(e) => onSetDayOverride(date, 'endTime', e.target.value)}
                    className="rounded-md border p-2 text-sm"
                    aria-label={`Override end time for ${date}`}
                    title={`Override end time for ${date}`}
                  />
                  <button type="button" onClick={() => onClearDayOverride(date)} className="rounded-md border px-2 py-2 text-xs">
                    Reset
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={overnightHold} onChange={(e) => onOvernightHoldChange(e.target.checked)} />
        Leave sets/equipment overnight (holding fee may apply)
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requestScout} onChange={(e) => onRequestScoutChange(e.target.checked)} />
        Request a 30-minute scout walkthrough before booking
      </label>

      {requestScout && (
        <label className="text-xs font-semibold text-gray-700">
          Scout notes
          <textarea value={scoutNotes} onChange={(e) => onScoutNotesChange(e.target.value)} rows={2} className="mt-1 w-full rounded-md border p-2 text-sm" placeholder="Preferred day/time and what your team needs to inspect." aria-label="Scout notes" title="Scout notes" />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-700">Attendees (max {maxEventGuests})</label>
          <select
            value={`${selectedAttendeeTier.minAttendees}-${selectedAttendeeTier.maxAttendees}`}
            onChange={(e) => {
              const [minValue] = e.target.value.split('-').map((part) => Number(part));
              onEventGuestsChange(Math.max(1, minValue));
            }}
            className="w-full rounded-md border p-2 text-sm"
            aria-label="Attendee pricing tier"
            title="Attendee pricing tier"
          >
            {attendeePricingTiers.map((tier) => {
              const value = `${tier.minAttendees}-${tier.maxAttendees}`;
              const surchargeLabel = tier.extraHourlyCents > 0
                ? `+$${Math.round(tier.extraHourlyCents / 100)}/hr`
                : '+$0/hr';
              return (
                <option key={value} value={value}>
                  {`${tier.minAttendees}-${tier.maxAttendees} people ${surchargeLabel}`}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Selected range: {selectedAttendeeTier.minAttendees}-{selectedAttendeeTier.maxAttendees} people
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Vehicles (base {baseParkingCapacity})</label>
          <input type="number" min={0} value={eventVehicles} onChange={(e) => onEventVehiclesChange(Math.max(0, Number(e.target.value || 0)))} className="w-full rounded-md border p-2 text-sm" aria-label="Event vehicle count" title="Event vehicle count" />
        </div>
      </div>

      {eventVehicles > baseParkingCapacity && (
        <p className="text-xs text-amber-700">Vehicle count exceeds base parking capacity. Extended parking coordination is recommended.</p>
      )}
      {eventCurfewTime && endsAfterCurfew && (
        <p className="text-xs text-amber-700">End time is after curfew ({eventCurfewTime}). This requires host review and may be declined.</p>
      )}
      {eventDurationHours > 0 && eventDurationHours < 4 && (
        <p className="text-xs text-gray-600">Note: events under 4 hours are billed at the 4-hour minimum.</p>
      )}
      {availabilityError && <p className="text-xs text-red-600">{availabilityError}</p>}
    </div>
  );
}

type StepTwoProps = {
  addonParking: boolean;
  addonEarlyAccess: boolean;
  addonLateExtension: boolean;
  onAddonParkingChange: (value: boolean) => void;
  onAddonEarlyAccessChange: (value: boolean) => void;
  onAddonLateExtensionChange: (value: boolean) => void;
};

export function EventStepTwo({
  addonParking,
  addonEarlyAccess,
  addonLateExtension,
  onAddonParkingChange,
  onAddonEarlyAccessChange,
  onAddonLateExtensionChange,
}: StepTwoProps) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold">Logistics Add-ons</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={addonParking} onChange={(e) => onAddonParkingChange(e.target.checked)} />
        Extended parking coordination
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={addonEarlyAccess} onChange={(e) => onAddonEarlyAccessChange(e.target.checked)} />
        Early access setup
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={addonLateExtension} onChange={(e) => onAddonLateExtensionChange(e.target.checked)} />
        Late extension (curfew-capped)
      </label>
    </div>
  );
}

type StepThreeProps = {
  eventType: string;
  eventDescription: string;
  alcohol: boolean;
  amplifiedSound: boolean;
  vendors: string;
  crewSize: string;
  equipmentScale: string;
  onEventTypeChange: (value: string) => void;
  onEventDescriptionChange: (value: string) => void;
  onAlcoholChange: (value: boolean) => void;
  onAmplifiedSoundChange: (value: boolean) => void;
  onVendorsChange: (value: string) => void;
  onCrewSizeChange: (value: string) => void;
  onEquipmentScaleChange: (value: string) => void;
};

export function EventStepThree({
  eventType,
  eventDescription,
  alcohol,
  amplifiedSound,
  vendors,
  crewSize,
  equipmentScale,
  onEventTypeChange,
  onEventDescriptionChange,
  onAlcoholChange,
  onAmplifiedSoundChange,
  onVendorsChange,
  onCrewSizeChange,
  onEquipmentScaleChange,
}: StepThreeProps) {
  const [showEventTypeGuide, setShowEventTypeGuide] = useState(false);

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={() => setShowEventTypeGuide((previous) => !previous)}
        className="flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">Event Details</span>
        <span className="text-sm text-gray-500">{showEventTypeGuide ? '▴' : '▾'}</span>
      </button>
      {showEventTypeGuide && (
        <p className="text-xs text-gray-600">Great for photo shoots, meetings, workshops, birthdays, weddings, graduations, pop-ups, and production events.</p>
      )}
      <label className="text-xs font-semibold text-gray-700">Event type</label>
      <select value={eventType} onChange={(e) => onEventTypeChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" aria-label="Event type" title="Event type">
        <option value="corporate">Corporate</option>
        <option value="private_celebration">Private celebration</option>
        <option value="intimate_wedding">Intimate wedding</option>
        <option value="production">Production</option>
        <option value="other">Other</option>
      </select>

      <label className="text-xs font-semibold text-gray-700">Event description (required)</label>
      <textarea value={eventDescription} onChange={(e) => onEventDescriptionChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" rows={3} placeholder="Describe your event" aria-label="Event description" title="Event description" />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <input type="checkbox" checked={alcohol} onChange={(e) => onAlcoholChange(e.target.checked)} className="mr-2" />
          Alcohol
        </label>
        <label className="text-sm">
          <input type="checkbox" checked={amplifiedSound} onChange={(e) => onAmplifiedSoundChange(e.target.checked)} className="mr-2" />
          Amplified sound
        </label>
      </div>

      <label className="text-xs font-semibold text-gray-700">Vendors (required, comma-separated or type "None")</label>
      <input value={vendors} onChange={(e) => onVendorsChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="Caterer, DJ, Decor" aria-label="Event vendors" title="Event vendors" />

      {eventType === 'production' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Crew size (required)</label>
            <input value={crewSize} onChange={(e) => onCrewSizeChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="e.g., 8" aria-label="Production crew size" title="Production crew size" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Equipment scale (required)</label>
            <input value={equipmentScale} onChange={(e) => onEquipmentScaleChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="e.g., light / full" aria-label="Production equipment scale" title="Production equipment scale" />
          </div>
        </div>
      )}
    </div>
  );
}
