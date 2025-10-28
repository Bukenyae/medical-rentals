-- Add payment failure metadata columns to bookings
-- Tracks Stripe failure code/message/timestamp for analytics and UX

begin;

alter table bookings
  add column if not exists payment_failure_code text,
  add column if not exists payment_failure_message text,
  add column if not exists payment_failure_at timestamptz;

commit;
