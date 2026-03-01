"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface CheckoutDialogProps {
  isOpen: boolean;
  amount: number; // in smallest currency unit (e.g., cents)
  currency?: string;
  metadata?: Record<string, string>;
  onClose: () => void;
  onSuccess?: (result: { paymentIntentId: string; bookingId: string }) => void;
  // Booking details to create a draft prior to payment
  propertyId: string;
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

export default function CheckoutDialog(props: CheckoutDialogProps) {
  const { isOpen, amount, currency = "usd", metadata, onClose, onSuccess, propertyId, propertyTitle, checkIn, checkOut, guests } = props;

  const options = useMemo(
    () => ({
      appearance: { theme: "stripe" as const },
    }),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Secure checkout</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <Elements stripe={stripePromise} options={options}>
          <CardForm
            amount={amount}
            currency={currency}
            metadata={metadata}
            onClose={onClose}
            onSuccess={onSuccess}
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
          />
        </Elements>
      </div>
    </div>
  );
}

function CardForm({ amount, currency, metadata, onClose, onSuccess, propertyId, propertyTitle, checkIn, checkOut, guests }: Omit<CheckoutDialogProps, "isOpen">) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const draftRunRef = useRef<{ key: string; status: "pending" | "done" } | null>(null);

  useEffect(() => {
    async function createDraftAndIntent() {
      try {
        setIsLoading(true);
        setError(null);
        setWarning(null);
        // Basic client-side validation to avoid obvious 400s
        if (!amount || amount <= 0) {
          throw new Error("Payment amount is invalid.");
        }
        if (!guests || guests < 1) {
          throw new Error("Please select at least 1 guest.");
        }

        const toIsoDate = (v: string | null | undefined) => {
          if (!v) return "";
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) return "";
          return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
            .toISOString()
            .slice(0, 10);
        };
        const isoCheckIn = toIsoDate(checkIn);
        const isoCheckOut = toIsoDate(checkOut);

        // Validate UUID (server expects UUID for property_id)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let newBookingId: string | null = null;
        // 1) Create booking draft first (store total as decimal)
        // If propertyId is a UUID, send it; otherwise attempt server-side resolution via propertyTitle
        const draftPayload = {
          propertyId: propertyId && uuidRegex.test(propertyId) ? propertyId : undefined,
          propertyTitle,
          checkIn: isoCheckIn,
          checkOut: isoCheckOut,
          guests,
          totalAmount: amount / 100,
        };

        const payloadKey = JSON.stringify(draftPayload);
        if (draftRunRef.current?.key === payloadKey) {
          if (draftRunRef.current.status === "pending" || clientSecret) {
            return;
          }
        }
        draftRunRef.current = { key: payloadKey, status: "pending" };

        const draftRes = await fetch("/api/bookings/create-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftPayload),
        });
        const draftJson = await draftRes.json();
        if (!draftRes.ok || !draftJson?.bookingId) {
          throw new Error(draftJson?.error || "Failed to create booking draft");
        }
        newBookingId = draftJson.bookingId as string;
        setBookingId(newBookingId);

        // 2) Create PaymentIntent (requires bookingId)
        const res = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: newBookingId,
            amount,
            currency,
            metadata: {
              ...(metadata || {}),
              property_ref: propertyId || "",
              check_in: isoCheckIn || "",
              check_out: isoCheckOut || "",
              guests: String(guests ?? ""),
            },
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.clientSecret) {
          throw new Error(json?.error || "Failed to create PaymentIntent");
        }
        setClientSecret(json.clientSecret as string);
        draftRunRef.current = { key: payloadKey, status: "done" };
      } catch (e: any) {
        setError(e?.message || "Unexpected error");
        draftRunRef.current = null;
      } finally {
        setIsLoading(false);
      }
    }
    createDraftAndIntent();
  }, [amount, currency, metadata, propertyId, propertyTitle, checkIn, checkOut, guests, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setIsLoading(true);
    setError(null);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (confirmError) throw new Error(confirmError.message);

      if (paymentIntent?.status === "succeeded") {
        if (!bookingId) {
          setWarning("Payment succeeded but booking reference is missing. Please contact support.");
          return;
        }
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('booking:draft');
          }
        } catch {/* ignore */}
        onSuccess?.({ paymentIntentId: paymentIntent.id, bookingId });
        onClose();
      } else if (paymentIntent?.status === "requires_action") {
        // 3DS handled by confirmCardPayment; if still requires action, show message
        setError("Additional authentication required. Please try again.");
      } else {
        setError("Payment could not be completed. Please try a different card.");
      }
    } catch (e: any) {
      setError(e?.message || "Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-gray-300 p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {warning && <p className="text-sm text-amber-600">{warning}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || !clientSecret || isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Pay now"}
        </button>
      </div>
    </form>
  );
}
