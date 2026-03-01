import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    })
  : (null as unknown as Stripe);

export const isStripeConfigured = Boolean(secretKey);

export function requireStripe(): Stripe {
  if (!isStripeConfigured) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.');
  }
  return stripe as Stripe;
}
