-- Ensure each Stripe PaymentIntent can be linked to only one booking
-- Partial unique index so multiple nulls remain allowed

begin;

create unique index if not exists bookings_payment_intent_id_key
  on bookings (payment_intent_id)
  where payment_intent_id is not null;

commit;
