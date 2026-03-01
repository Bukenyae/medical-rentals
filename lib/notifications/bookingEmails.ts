import { getServiceSupabase } from '@/lib/supabase/service';

type ApprovalEmailInput = {
  guestUserId: string;
  bookingId: string;
  propertyTitle?: string | null;
  startAt?: string | null;
  endAt?: string | null;
};

function resolveBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL;
  if (!vercel) return 'http://localhost:3000';
  if (vercel.startsWith('http://') || vercel.startsWith('https://')) return vercel;
  return `https://${vercel}`;
}

export async function sendBookingApprovalPaymentEmail(input: ApprovalEmailInput) {
  const service = getServiceSupabase();

  const { data: userData, error: userError } = await service.auth.admin.getUserById(input.guestUserId);
  if (userError) throw new Error(userError.message);

  const guestEmail = userData.user?.email;
  if (!guestEmail) throw new Error('Guest email not found');

  const baseUrl = resolveBaseUrl().replace(/\/$/, '');
  const paymentPath = `/portal/guest/payment?booking=${encodeURIComponent(input.bookingId)}`;
  const paymentUrl = `${baseUrl}${paymentPath}`;

  const { error: otpError } = await service.auth.signInWithOtp({
    email: guestEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: paymentUrl,
      data: {
        email_type: 'booking_approval_payment',
        booking_id: input.bookingId,
        property_title: input.propertyTitle || '',
        booking_start_at: input.startAt || '',
        booking_end_at: input.endAt || '',
      },
    },
  });

  if (otpError) throw new Error(otpError.message);

  return {
    sent: true,
    email: guestEmail,
    paymentUrl,
  };
}
