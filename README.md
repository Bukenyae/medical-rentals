# Medical Rentals

This project uses Next.js and Supabase to provide a medical rental platform.

## Environment Variables

Create a `.env.local` file based on `.env.local.example` and provide the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=...
```

Make sure these variables are also configured in your deployment environment (e.g., Vercel).

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed Google OAuth instructions.

