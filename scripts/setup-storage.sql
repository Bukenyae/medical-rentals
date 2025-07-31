-- Setup script for Supabase Storage buckets
-- Run this in your Supabase SQL Editor

-- Create property-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for property-images bucket
CREATE POLICY "Property owners can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-images' AND
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id::text = (storage.foldername(name))[1] 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can view their images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'property-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM properties 
        WHERE properties.id::text = (storage.foldername(name))[1] 
        AND properties.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Property owners can delete their images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'property-images' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM properties 
        WHERE properties.id::text = (storage.foldername(name))[1] 
        AND properties.owner_id = auth.uid()
      )
    )
  );

-- Public access for property images (guests can view)
CREATE POLICY "Public can view property images" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');