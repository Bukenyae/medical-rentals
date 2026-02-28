type StepOneProps = {
  todayIso: string;
  eventDate: string;
  eventStart: string;
  eventEnd: string;
  maxEventGuests: number;
  eventGuests: number;
  eventVehicles: number;
  baseParkingCapacity: number;
  endsAfterCurfew: boolean;
  eventDurationHours: number;
  availabilityError: string | null;
  eventCurfewTime?: string | null;
  onEventDateChange: (value: string) => void;
  onEventStartChange: (value: string) => void;
  onEventEndChange: (value: string) => void;
  onEventGuestsChange: (value: number) => void;
  onEventVehiclesChange: (value: number) => void;
};

export function EventStepOne({
  todayIso,
  eventDate,
  eventStart,
  eventEnd,
  maxEventGuests,
  eventGuests,
  eventVehicles,
  baseParkingCapacity,
  endsAfterCurfew,
  eventDurationHours,
  availabilityError,
  eventCurfewTime,
  onEventDateChange,
  onEventStartChange,
  onEventEndChange,
  onEventGuestsChange,
  onEventVehiclesChange,
}: StepOneProps) {
  return (
    <div className="mt-3 space-y-2">
      <label className="text-xs font-semibold text-gray-700">Event date</label>
      <input type="date" min={todayIso} value={eventDate} onChange={(e) => onEventDateChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-700">Start time</label>
          <input type="time" value={eventStart} onChange={(e) => onEventStartChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">End time</label>
          <input type="time" value={eventEnd} onChange={(e) => onEventEndChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-700">Guests (max {maxEventGuests})</label>
          <input type="number" min={1} max={maxEventGuests} value={eventGuests} onChange={(e) => onEventGuestsChange(Math.max(1, Number(e.target.value || 1)))} className="w-full rounded-md border p-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Vehicles (base {baseParkingCapacity})</label>
          <input type="number" min={0} value={eventVehicles} onChange={(e) => onEventVehiclesChange(Math.max(0, Number(e.target.value || 0)))} className="w-full rounded-md border p-2 text-sm" />
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
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold">Event Details</p>
      <label className="text-xs font-semibold text-gray-700">Event type</label>
      <select value={eventType} onChange={(e) => onEventTypeChange(e.target.value)} className="w-full rounded-md border p-2 text-sm">
        <option value="corporate">Corporate</option>
        <option value="private_celebration">Private celebration</option>
        <option value="intimate_wedding">Intimate wedding</option>
        <option value="production">Production</option>
        <option value="other">Other</option>
      </select>

      <label className="text-xs font-semibold text-gray-700">Event description (required)</label>
      <textarea value={eventDescription} onChange={(e) => onEventDescriptionChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" rows={3} placeholder="Describe your event" />

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
      <input value={vendors} onChange={(e) => onVendorsChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="Caterer, DJ, Decor" />

      {eventType === 'production' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700">Crew size (required)</label>
            <input value={crewSize} onChange={(e) => onCrewSizeChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="e.g., 8" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Equipment scale (required)</label>
            <input value={equipmentScale} onChange={(e) => onEquipmentScaleChange(e.target.value)} className="w-full rounded-md border p-2 text-sm" placeholder="e.g., light / full" />
          </div>
        </div>
      )}
    </div>
  );
}
