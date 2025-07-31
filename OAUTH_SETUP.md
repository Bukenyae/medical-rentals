# Google OAuth Setup Guide

## Issue: "Safari Can't Find the Server" during Google OAuth

This error occurs when Google OAuth is not properly configured in your Supabase project. Here's how to fix it:

## Step 1: Configure Google OAuth in Supabase Dashboard

1. **Go to your Supabase project dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your `medical-rentals` project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the list of providers
   - Toggle it to "Enabled"

4. **Configure Google OAuth Settings**
   You need to add your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)

## Step 2: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Fill in required fields:
     - App name: "Medical Rentals"
     - User support email: your email
     - Developer contact: your email

5. **Set Authorized Redirect URIs**
   In your OAuth 2.0 client configuration, add these URIs:
   ```
   https://medicalrentalspub.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (for development)
   ```

## Step 3: Update Supabase Configuration

1. **Copy your Google OAuth credentials**
   - Client ID: `your-google-client-id.apps.googleusercontent.com`
   - Client Secret: `your-google-client-secret`

2. **Add to Supabase**
   - In Supabase Dashboard > Authentication > Providers > Google
   - Paste the Client ID and Client Secret
   - Save the configuration

## Step 4: Verify Configuration

1. **Check your current Google Cloud Console settings**
   From your screenshot, I can see you already have:
   - Authorized JavaScript origins: `https://medical-rentals-oz88.vercel.app`
   - Authorized redirect URIs: `https://medical-rentals-oz88.vercel.app/auth/callback`

2. **Add the missing Supabase redirect URI**
   You need to add this to your Google Cloud Console:
   ```
   https://medicalrentalspub.supabase.co/auth/v1/callback
   ```

## Step 5: Test the Fix

1. **Clear browser cache and cookies**
2. **Try Google OAuth again**
3. **Check browser developer tools for any errors**

## Alternative: Use Email/Password Authentication

If Google OAuth continues to have issues, users can still sign up with email/password:

1. Click "Create account" instead of "Sign up with Google"
2. Enter email and password
3. Check email for confirmation link
4. Click the confirmation link to activate account

## Troubleshooting

If you're still having issues:

1. **Check Supabase logs**
   - Go to Supabase Dashboard > Logs
   - Look for authentication errors

2. **Verify environment variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

3. **Test with the API endpoint**
   - Visit: `https://medical-rentals-oz88.vercel.app/api/test-properties`
   - This will show if basic authentication is working

## Quick Fix for Testing

For immediate testing, you can:

1. **Use email/password signup** instead of Google OAuth
2. **Create a test account** with any email/password
3. **Test the property API** once authenticated

The property CRUD functionality will work regardless of the OAuth method used.