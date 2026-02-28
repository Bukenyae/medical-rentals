import { User } from '@supabase/supabase-js';
import { toCurrency } from '@/lib/pricing';
import { BookingCardProperty } from './types';
import { EventStepOne, EventStepThree, EventStepTwo } from './EventSteps';
import { useEventBookingFlow } from './useEventBookingFlow';

const RISK_REASON_MAP: Record<string, string> = {
  ALCOHOL: 'Alcohol service selected',
  AMPLIFIED_SOUND: 'Amplified sound selected',
  OVER_PARKING: 'Vehicle count exceeds standard parking capacity',
  LATE_END: 'Event ends after curfew',
  WEDDING: 'Wedding category requires review',
  PRODUCTION: 'Production category requires review',
};

type Props = {
  property: BookingCardProperty;
  propertyId: string;
  user: User | null;
  onRequireAuth: () => void;
};

export default function EventBookingPanel({ property, propertyId, user, onRequireAuth }: Props) {
  const { state, derived, actions } = useEventBookingFlow({ property, propertyId, user, onRequireAuth });

  const riskReasons = (state.eventQuote?.riskFlags || []).map((flag) => RISK_REASON_MAP[flag] || flag);
  const policyChecklist = [
    { label: 'Alcohol', value: state.alcohol ? 'Yes' : 'No' },
    { label: 'Amplified sound', value: state.amplifiedSound ? 'Yes' : 'No' },
    { label: 'After curfew', value: derived.endsAfterCurfew ? 'Yes' : 'No' },
    { label: 'Vehicles', value: `${state.eventVehicles}/${derived.baseParkingCapacity}` },
    { label: 'Event type', value: state.eventType.replace(/_/g, ' ') },
    { label: 'Availability', value: derived.isAvailable === true ? 'Available' : derived.isAvailable === false ? 'Unavailable' : 'Unverified' },
  ];

  return (
    <>
      <p className="text-sm font-semibold text-gray-900">Event Booking</p>
      <p className="mt-1 text-xs text-gray-600">From {toCurrency(derived.hourlyRateCents / 100)}/hr · Timezone: {derived.timezone}</p>
      <p className="mt-2 text-xs font-semibold text-gray-700">Step {state.eventStep} of 3</p>

      {state.eventStep === 1 && (
        <EventStepOne
          todayIso={derived.todayIso}
          eventDate={state.eventDate}
          eventStart={state.eventStart}
          eventEnd={state.eventEnd}
          maxEventGuests={derived.maxEventGuests}
          eventGuests={state.eventGuests}
          eventVehicles={state.eventVehicles}
          baseParkingCapacity={derived.baseParkingCapacity}
          endsAfterCurfew={derived.endsAfterCurfew}
          eventDurationHours={derived.eventDurationHours}
          availabilityError={state.availabilityError}
          eventCurfewTime={property.eventCurfewTime}
          onEventDateChange={actions.setEventDate}
          onEventStartChange={actions.setEventStart}
          onEventEndChange={actions.setEventEnd}
          onEventGuestsChange={actions.setEventGuests}
          onEventVehiclesChange={actions.setEventVehicles}
        />
      )}
      {state.eventStep === 2 && (
        <EventStepTwo
          addonParking={state.addonParking}
          addonEarlyAccess={state.addonEarlyAccess}
          addonLateExtension={state.addonLateExtension}
          onAddonParkingChange={actions.setAddonParking}
          onAddonEarlyAccessChange={actions.setAddonEarlyAccess}
          onAddonLateExtensionChange={actions.setAddonLateExtension}
        />
      )}
      {state.eventStep === 3 && (
        <EventStepThree
          eventType={state.eventType}
          eventDescription={state.eventDescription}
          alcohol={state.alcohol}
          amplifiedSound={state.amplifiedSound}
          vendors={state.vendors}
          crewSize={state.crewSize}
          equipmentScale={state.equipmentScale}
          onEventTypeChange={actions.setEventType}
          onEventDescriptionChange={actions.setEventDescription}
          onAlcoholChange={actions.setAlcohol}
          onAmplifiedSoundChange={actions.setAmplifiedSound}
          onVendorsChange={actions.setVendors}
          onCrewSizeChange={actions.setCrewSize}
          onEquipmentScaleChange={actions.setEquipmentScale}
        />
      )}

      {state.eventQuote && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex justify-between"><span>Mode</span><span className="font-semibold">{state.eventQuote.mode === 'instant' ? 'Instant book' : 'Request to book'}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{toCurrency(state.eventQuote.subtotalCents / 100)}</span></div>
          <div className="flex justify-between"><span>Fees + Add-ons</span><span>{toCurrency((state.eventQuote.feesCents + state.eventQuote.addonsTotalCents) / 100)}</span></div>
          <div className="flex justify-between"><span>Deposit authorization</span><span>{toCurrency(state.eventQuote.depositCents / 100)}</span></div>
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{toCurrency(state.eventQuote.totalCents / 100)}</span></div>
          {riskReasons.length > 0 && <p className="mt-2 text-xs text-amber-700">Request reason: {riskReasons.join(' · ')}</p>}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
        <p className="font-semibold text-gray-900">Live risk and policy snapshot</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {policyChecklist.map((row) => (
            <p key={row.label} className="flex justify-between gap-2">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-medium capitalize text-gray-900">{row.value}</span>
            </p>
          ))}
        </div>
      </div>

      {state.eventStep === 3 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <p className="font-semibold text-gray-900">Before you submit</p>
          <p className="mt-1">Host response target: up to 48 business hours.</p>
          <p>Deposit is an authorization hold and is not captured unless policy terms require it.</p>
          <p>COI/ID may be requested depending on event risk and property policy.</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => actions.setEventStep((s) => Math.max(1, s - 1))} disabled={state.eventStep === 1} className="flex-1 rounded-md border py-2 text-sm">Back</button>
        <button onClick={actions.advanceStep} disabled={state.isSubmitting || (state.eventStep === 1 && derived.availabilityUnknown)} className="flex-1 rounded-md bg-gray-900 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {state.isSubmitting ? 'Submitting...' : state.eventStep < 3 ? 'Next' : state.eventQuote?.mode === 'instant' ? 'Instant book event' : 'Request to book'}
        </button>
      </div>

      {state.eventError && <p className="mt-2 text-sm text-red-600">{state.eventError}</p>}
      {state.eventSuccess && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
          <p>{state.eventSuccess}</p>
          {state.submittedBookingId && <p className="mt-1 text-xs">Booking ID: {state.submittedBookingId}</p>}
          <p className="mt-1 text-xs">Next step: watch your email for approval and payment/deposit hold confirmation.</p>
        </div>
      )}
    </>
  );
}
