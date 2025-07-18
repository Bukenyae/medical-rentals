# Medical Rentals Platform Deployment Guide

This guide outlines the steps to deploy the Medical Rentals platform to production using GitHub, Supabase, and Vercel.

## Prerequisites

- GitHub account with repository access
- Supabase account with a production project created
- Vercel account linked to your GitHub
- Domain name (optional but recommended)

## 1. GitHub Repository Setup

1. Create a new GitHub repository for the project (if not already done)
2. Push your code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/medical-rentals.git
git push -u origin main
```

## 2. Supabase Production Setup

### Database Configuration

1. Create a new Supabase project in the production organization
2. Run the database migrations in order:
   - Navigate to the SQL Editor in Supabase dashboard
   - Execute each migration file from `database/migrations` in sequence
   - Verify the schema matches the expected structure

### Row Level Security (RLS) Policies

1. Verify all RLS policies are correctly applied:
   - Check `database/migrations/002_rls_policies.sql` for the policies
   - Ensure they're properly implemented in the production database

### Storage Buckets

1. Create the necessary storage buckets:
   - `property-images` - For property listing images
   - `receipts` - For expense receipt uploads
   - `documents` - For any additional documents

2. Configure appropriate bucket policies:
   - Public read access for property images
   - Authenticated access for receipts and documents

### Authentication Setup

1. Configure authentication providers in Supabase dashboard:
   - Email/password authentication
   - (Optional) Google OAuth
   - (Optional) GitHub OAuth

2. Set up email templates for:
   - Welcome emails
   - Password reset
   - Email confirmation

## 3. Environment Variables Configuration

Create a production `.env` file based on the `.env.local.example` template:

```
# Supabase Production Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com

# Google Maps API Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key

# OAuth Provider Configuration (if using)
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
```

## 4. Vercel Deployment Setup

### Initial Deployment

1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework preset: Next.js
   - Build command: `next build`
   - Output directory: `.next`
   - Install command: `npm ci`

### Environment Variables

1. Add all production environment variables from your `.env` file to Vercel project settings
2. Ensure all sensitive keys are properly secured

### Domain Configuration

1. Add your custom domain in Vercel project settings
2. Configure DNS settings as instructed by Vercel
3. Enable HTTPS with automatic SSL certificate

## 5. Monitoring and Error Tracking

### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. Set up performance monitoring

### Error Tracking

1. Consider adding an error tracking service like Sentry:
   ```bash
   npm install @sentry/nextjs
   ```

2. Configure Sentry in your Next.js app (optional)

## 6. Backup Strategy

### Database Backups

1. Enable daily automated backups in Supabase
2. Set up a retention policy for backups
3. Document the restore procedure

### Code Backups

1. Ensure GitHub repository has protected branches
2. Consider setting up GitHub Actions for automated testing

## 7. Production Checklist

Before going live, verify:

- [ ] All environment variables are correctly set
- [ ] Database migrations run successfully
- [ ] RLS policies are properly configured
- [ ] Authentication providers are working
- [ ] Storage buckets are set up with correct permissions
- [ ] SSL is properly configured
- [ ] Monitoring is in place
- [ ] Backup strategy is implemented
- [ ] Performance testing has been conducted

## 8. Post-Deployment Verification

After deployment, verify:

- [ ] All pages load correctly
- [ ] Authentication flows work
- [ ] Property listings display correctly
- [ ] Booking functionality works end-to-end
- [ ] Real-time features (messaging, notifications) function properly
- [ ] Google Maps integration displays correctly
- [ ] Mobile responsiveness works across devices