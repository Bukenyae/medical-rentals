import { SupabaseClient } from '@supabase/supabase-js';
import { BookingDraftInput, BookingKind, BookingStatus, QuoteResult } from '@/lib/bookings/types';
import { resolveSubmissionOutcome } from '@/lib/bookings/submission-core.mjs';

export { approveBooking, capturePayment, releaseDepositHold } from '@/lib/bookings/lifecycle-payments';

export async function createDraftBooking(
  supabase: SupabaseClient,
  userId: string,
  input: BookingDraftInput
) {
  const checkIn = new Date(input.startAt).toISOString().slice(0, 10);
  const checkOut = new Date(input.endAt).toISOString().slice(0, 10);
  const status: BookingStatus = 'draft';

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      property_id: input.propertyId,
      guest_id: userId,
      user_id: userId,
      kind: input.kind,
      mode: input.mode,
      status,
      check_in: checkIn,
      check_out: checkOut,
      start_at: input.startAt,
      end_at: input.endAt,
      guest_count: input.guestCount,
      total_amount: input.quote.totalCents / 100,
      currency: input.quote.currency,
      subtotal_cents: input.quote.subtotalCents,
      fees_cents: input.quote.feesCents,
      addons_total_cents: input.quote.addonsTotalCents,
      total_cents: input.quote.totalCents,
      deposit_cents: input.quote.depositCents,
      pricing_snapshot: input.quote.pricingSnapshot,
      blocks_calendar: false,
    })
    .select('id, kind, mode, status')
    .single();

  if (error) throw new Error(error.message);

  if (input.kind === 'event' && input.eventDetails) {
    const { error: detailError } = await supabase.from('event_booking_details').insert({
      booking_id: booking.id,
      event_type: (input.eventDetails.eventType as string) ?? 'other',
      estimated_vehicle_count: input.eventDetails.estimatedVehicleCount ?? null,
      alcohol: input.eventDetails.alcohol ?? false,
      amplified_sound: input.eventDetails.amplifiedSound ?? false,
      event_description: input.eventDetails.eventDescription ?? 'Event request',
      vendors: input.eventDetails.vendors ?? [],
      production_details: input.eventDetails.productionDetails ?? null,
    });

    if (detailError) throw new Error(detailError.message);
  }

  if (input.kind === 'stay' && input.stayDetails) {
    const { error: detailError } = await supabase.from('stay_booking_details').insert({
      booking_id: booking.id,
      adults: input.stayDetails.adults ?? null,
      children: input.stayDetails.children ?? null,
      infants: input.stayDetails.infants ?? null,
      pets: input.stayDetails.pets ?? false,
      special_requests: input.stayDetails.specialRequests ?? null,
    });

    if (detailError) throw new Error(detailError.message);
  }

  return booking;
}

export async function submitBookingRequest(
  supabase: SupabaseClient,
  bookingId: string,
  quote: QuoteResult,
  kind: BookingKind
) {
  const outcome = resolveSubmissionOutcome(kind, quote.mode, quote.riskFlags);
  const status = outcome.status as BookingStatus;

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      mode: outcome.mode,
      status,
      pricing_snapshot: {
        ...(quote.pricingSnapshot || {}),
        riskFlags: quote.riskFlags,
      },
      blocks_calendar: outcome.blocksCalendar,
    })
    .eq('id', bookingId)
    .select('id, kind, mode, status, property_id')
    .single();

  if (error) throw new Error(error.message);

  if (quote.riskFlags.length > 0) {
    const rows = quote.riskFlags.map((flag) => ({
      booking_id: bookingId,
      flag_code: flag,
      severity: 2,
      details: { source: 'event_submit' },
    }));
    const { error: riskError } = await supabase.from('booking_risk_flags').insert(rows);
    if (riskError) throw new Error(riskError.message);
  }

  return booking;
}
