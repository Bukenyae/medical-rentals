"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

interface InlineCheckoutFormProps {
  expanded: boolean;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  propertyId: string;
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  onCancel: () => void;
  onSuccess?: (result: { paymentIntentId: string; bookingId: string }) => void;
  introText?: string;
}

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

export default function InlineCheckoutForm(props: InlineCheckoutFormProps) {
  const {
    expanded,
    amount,
    currency = "usd",
    metadata,
    propertyId,
    propertyTitle,
    checkIn,
    checkOut,
    guests,
    onCancel,
    onSuccess,
    introText,
  } = props;

  const options = useMemo(
    () => ({
      appearance: { theme: "stripe" as const },
    }),
    []
  );

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        expanded ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {introText && <p className="text-sm text-gray-600">{introText}</p>}
        <Elements stripe={stripePromise} options={options}>
          <CardForm
            amount={amount}
            currency={currency}
            metadata={metadata}
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onCancel={onCancel}
            onSuccess={onSuccess}
            expanded={expanded}
          />
        </Elements>
      </div>
    </div>
  );
}

interface CardFormProps extends Omit<InlineCheckoutFormProps, "introText"> {
  expanded: boolean;
}

function CardForm({
  amount,
  currency = "usd",
  metadata,
  propertyId,
  propertyTitle,
  checkIn,
  checkOut,
  guests,
  onCancel,
  onSuccess,
  expanded,
}: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const draftRunRef = useRef<{ key: string; status: "pending" | "done" } | null>(null);

  useEffect(() => {
    if (!expanded) return;
    async function createDraftAndIntent() {
      try {
        setIsLoading(true);
        setError(null);
        setWarning(null);
        if (!amount || amount <= 0) {
          throw new Error("Payment amount is invalid.");
        }
        if (!guests || guests < 1) {
          throw new Error("Please select at least 1 guest.");
        }

        const toIsoDate = (value: string | null | undefined) => {
          if (!value) return "";
          const parsed = new Date(value);
          if (Number.isNaN(parsed.getTime())) return "";
          return new Date(
            Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
          )
            .toISOString()
            .slice(0, 10);
        };
        const isoCheckIn = toIsoDate(checkIn);
        const isoCheckOut = toIsoDate(checkOut);

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
        const newBookingId = draftJson.bookingId as string;
        setBookingId(newBookingId);

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
      } catch (err: any) {
        setError(err?.message || "Unexpected error");
        draftRunRef.current = null;
      } finally {
        setIsLoading(false);
      }
    }
    void createDraftAndIntent();
  }, [expanded, amount, currency, metadata, propertyId, propertyTitle, checkIn, checkOut, guests, clientSecret]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsLoading(true);
    setError(null);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message || "Payment failed");
      }

      if (paymentIntent?.status === "requires_action") {
        setWarning("Additional authentication required. Please follow the prompts to verify your card.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        if (bookingId) {
          onSuccess?.({
            paymentIntentId: paymentIntent.id,
            bookingId,
          });
        }
      } else {
        throw new Error("Payment could not be completed.");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="rounded-md border border-gray-300 p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {warning && <p className="text-sm text-amber-600">{warning}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements || !clientSecret}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            "Pay"
          )}
        </button>
      </div>
    </form>
  );
}
