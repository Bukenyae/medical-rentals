# Belle Rouge Properties

Belle Rouge Properties provides flexible short-term rentals near hospitals, universities, and military installations. Originally built for travel nurses and medical professionals, the platform now serves a wider audience including academics, service members, college students, graduates, and young professionals seeking convenient temporary housing.

## Features
- Listings with essential amenities and furnished spaces
- Flexible lease terms suited for assignments, semesters, or training
- Property management tools and secure authentication powered by Supabase and Next.js

## Development
Run the development server:

```bash
npm install
npm run dev
```

## Stripe payment flow (local testing)

The project ships with a scripted test harness to exercise the booking draft and payment-intent flow end to end. To run it locally:

1. **Configure environment variables** in `.env.local`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (will be supplied by the Stripe CLI in step 3)
   - Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
2. **Stripe CLI**: Log in once with `stripe login`.
3. **Start webhook forwarding** in a dedicated terminal:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```
   Stripe will print a signing secret. Paste that value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.
4. Ensure the Next.js dev server is running (`npm run dev`).
5. Execute the payment flow script in another terminal:
   ```bash
   node scripts/run-payment-flow.mjs
   ```
   The script will create/confirm a Supabase test user, seed a booking draft, and call `/api/stripe/create-payment-intent`.
6. When prompted, confirm the PaymentIntent from the Stripe CLI output:
   ```bash
   stripe payment_intents confirm <PI_ID> --payment-method pm_card_visa
   ```
7. Return to the script terminal and press **Enter**. It will verify that the booking status was updated by the webhook and print the final result.

If any step fails, check the Stripe CLI log (webhook forwarding terminal) and server logs for detailed errors.

## Deployment
See [deployment-guide.md](deployment-guide.md) for steps to deploy the application.

## OAuth Setup
Refer to [OAUTH_SETUP.md](OAUTH_SETUP.md) for configuring Google OAuth.
