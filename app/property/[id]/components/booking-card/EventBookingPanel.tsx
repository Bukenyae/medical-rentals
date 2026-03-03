import { useState } from 'react';
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
  const [isRiskSnapshotOpen, setIsRiskSnapshotOpen] = useState(false);
  const [isBeforeSubmitOpen, setIsBeforeSubmitOpen] = useState(false);
  const [activePricingInfo, setActivePricingInfo] = useState<null | 'rate' | 'subtotal' | 'fees' | 'deposit'>(null);

  const riskReasons = (state.eventQuote?.riskFlags || []).map((flag) => RISK_REASON_MAP[flag] || flag);
  const quoteSnapshot = state.eventQuote?.pricingSnapshot;
  const sessionDays = quoteSnapshot?.sessionDays || [];
  const attendeeHourlySurchargeCents = quoteSnapshot?.attendeeHourlySurchargeCents ?? 0;
  const effectiveHourlyRateCents = derived.hourlyRateCents + attendeeHourlySurchargeCents;
  const subtotalCents = state.eventQuote?.subtotalCents ?? 0;
  const pricingInfoMap: Record<'rate' | 'subtotal' | 'fees' | 'deposit', string> = {
    rate: 'Base amount per hour multiplied by your billable booking hours, including attendee-tier adjustments when selected.',
    subtotal: 'Estimated booking subtotal before platform fees and add-ons are applied.',
    fees: 'Includes platform fees plus optional logistics add-ons selected in this booking flow.',
    deposit: 'An authorization hold for policy protection. It is not captured unless required by policy terms.',
  };
  const primaryCtaLabel = state.isSubmitting
    ? 'Submitting...'
    : state.eventStep < 3
      ? 'Next'
      : state.eventQuote?.mode === 'instant'
        ? 'Instant book event'
        : 'Request to book';
  const isPrimaryDisabled = state.isSubmitting || (state.eventStep === 1 && derived.availabilityUnknown);
  const onSkipAddons = () => {
    actions.setAddonParking(false);
    actions.setAddonEarlyAccess(false);
    actions.setAddonLateExtension(false);
    actions.setEventStep(3);
  };
  const policyChecklist = [
    { label: 'Alcohol', value: state.alcohol ? 'Yes' : 'No' },
    { label: 'Amplified sound', value: state.amplifiedSound ? 'Yes' : 'No' },
    { label: 'After curfew', value: derived.endsAfterCurfew ? 'Yes' : 'No' },
    { label: 'Vehicles', value: `${state.eventVehicles}/${derived.baseParkingCapacity}` },
    { label: 'Session days', value: String(state.sessionDates.length || 0) },
    { label: 'Scout requested', value: state.requestScout ? 'Yes' : 'No' },
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
          eventStartDate={state.eventStartDate}
          eventEndDate={state.eventEndDate}
          globalStartTime={state.globalStartTime}
          globalEndTime={state.globalEndTime}
          sessionDates={state.sessionDates}
          dayOverrides={state.dayOverrides}
          overnightHold={state.overnightHold}
          requestScout={state.requestScout}
          scoutNotes={state.scoutNotes}
          maxEventGuests={derived.maxEventGuests}
          minimumEventHours={derived.minimumEventHours}
          attendeePricingTiers={derived.attendeePricingTiers}
          selectedAttendeeTier={derived.selectedAttendeeTier}
          eventVehicles={state.eventVehicles}
          baseParkingCapacity={derived.baseParkingCapacity}
          endsAfterCurfew={derived.endsAfterCurfew}
          eventDurationHours={derived.eventDurationHours}
          availabilityError={state.availabilityError}
          eventCurfewTime={property.eventCurfewTime}
          canExtendDay={derived.canExtendDay}
          hasExtendedDay={derived.hasExtendedDay}
          extendedDayDate={derived.extendedDayDate}
          onEventStartDateChange={actions.setEventStartDate}
          onEventEndDateChange={actions.setEventEndDate}
          onGlobalStartTimeChange={actions.setGlobalStartTime}
          onGlobalEndTimeChange={actions.setGlobalEndTime}
          onSetDayOverride={actions.setDayOverride}
          onClearDayOverride={actions.clearDayOverride}
          onOvernightHoldChange={actions.setOvernightHold}
          onRequestScoutChange={actions.setRequestScout}
          onScoutNotesChange={actions.setScoutNotes}
          onEventGuestsChange={actions.setEventGuests}
          onEventVehiclesChange={actions.setEventVehicles}
          onExtendDay={actions.extendOneDay}
          onRemoveExtendedDay={actions.removeExtendedDay}
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
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              Amt/Hr x Hrs
              <button
                type="button"
                onClick={() => setActivePricingInfo((previous) => previous === 'rate' ? null : 'rate')}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                aria-label="Explain hourly amount by hours"
              >
                ?
              </button>
            </span>
            <span>{toCurrency(effectiveHourlyRateCents / 100)} x {state.eventQuote.durationHours?.toFixed(1) || '0.0'}h</span>
          </div>
          {activePricingInfo === 'rate' && <p className="mt-1 text-xs text-gray-600">{pricingInfoMap.rate}</p>}
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              Subtotal
              <button
                type="button"
                onClick={() => setActivePricingInfo((previous) => previous === 'subtotal' ? null : 'subtotal')}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                aria-label="Explain subtotal"
              >
                ?
              </button>
            </span>
            <span>{toCurrency(subtotalCents / 100)}</span>
          </div>
          {activePricingInfo === 'subtotal' && <p className="mt-1 text-xs text-gray-600">{pricingInfoMap.subtotal}</p>}
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              Fees + Add-ons
              <button
                type="button"
                onClick={() => setActivePricingInfo((previous) => previous === 'fees' ? null : 'fees')}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                aria-label="Explain fees and add-ons"
              >
                ?
              </button>
            </span>
            <span>{toCurrency((state.eventQuote.feesCents + state.eventQuote.addonsTotalCents) / 100)}</span>
          </div>
          {activePricingInfo === 'fees' && <p className="mt-1 text-xs text-gray-600">{pricingInfoMap.fees}</p>}
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              Deposit
              <button
                type="button"
                onClick={() => setActivePricingInfo((previous) => previous === 'deposit' ? null : 'deposit')}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
                aria-label="Explain deposit authorization"
              >
                ?
              </button>
            </span>
            <span>{toCurrency(state.eventQuote.depositCents / 100)}</span>
          </div>
          {activePricingInfo === 'deposit' && <p className="mt-1 text-xs text-gray-600">{pricingInfoMap.deposit}</p>}
          <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{toCurrency(state.eventQuote.totalCents / 100)}</span></div>
          {sessionDays.length > 1 && (
            <p className="mt-2 text-xs text-gray-600">{sessionDays.length} days selected · Global {state.globalStartTime} to {state.globalEndTime} (local)</p>
          )}
          {riskReasons.length > 0 && <p className="mt-2 text-xs text-amber-700">Request reason: {riskReasons.join(' · ')}</p>}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
        <button
          type="button"
          onClick={() => setIsRiskSnapshotOpen((previous) => !previous)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-semibold text-gray-900">Live risk and policy snapshot</span>
          <span className="text-sm text-gray-500">{isRiskSnapshotOpen ? '▴' : '▾'}</span>
        </button>
        {!isRiskSnapshotOpen && (
          <p className="mt-1 text-xs text-gray-500">{riskReasons.length} risk flags · {policyChecklist.find((entry) => entry.label === 'Availability')?.value}</p>
        )}
        {isRiskSnapshotOpen && (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {policyChecklist.map((row) => (
              <p key={row.label} className="flex justify-between gap-2">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-medium capitalize text-gray-900">{row.value}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {state.eventStep === 3 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <button
            type="button"
            onClick={() => setIsBeforeSubmitOpen((previous) => !previous)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-semibold text-gray-900">Before you submit</span>
            <span className="text-sm text-gray-500">{isBeforeSubmitOpen ? '▴' : '▾'}</span>
          </button>
          {!isBeforeSubmitOpen && <p className="mt-1">3 quick checks before request submission.</p>}
          {isBeforeSubmitOpen && (
            <>
              <p className="mt-1">Host response target: up to 48 business hours.</p>
              <p>Deposit is an authorization hold and is not captured unless policy terms require it.</p>
              <p>COI/ID may be requested depending on event risk and property policy.</p>
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => actions.setEventStep((s) => Math.max(1, s - 1))} disabled={state.eventStep === 1} className="flex-1 rounded-md border py-2 text-sm">Back</button>
        {state.eventStep === 2 && (
          <button
            onClick={onSkipAddons}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Skip add-ons
          </button>
        )}
        <button onClick={actions.advanceStep} disabled={isPrimaryDisabled} className="flex-1 rounded-md bg-gray-900 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {primaryCtaLabel}
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
