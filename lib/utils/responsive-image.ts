import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../database.types';

// Create a Supabase client for use in the browser
const createClient = () => createClientComponentClient<Database>();

/**
 * Get a responsive image URL with transformations
 * @param bucket - The storage bucket name
 * @param path - The path to the image in storage
 * @param width - The desired width of the image
 * @param height - The desired height of the image (optional)
 * @param quality - The quality of the image (1-100)
 * @returns The transformed image URL
 */
export function getResponsiveImageUrl(
  bucket: string,
  path: string,
  width: number,
  height?: number,
  quality = 80
): string {
  const supabase = createClient();
  
  // Get the public URL for the image
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  
  // Add transformation parameters
  const url = new URL(publicUrl);
  
  // Add width parameter
  url.searchParams.append('width', width.toString());
  
  // Add height parameter if provided
  if (height) {
    url.searchParams.append('height', height.toString());
  }
  
  // Add quality parameter
  url.searchParams.append('quality', quality.toString());
  
  // Add format parameter for WebP if supported
  url.searchParams.append('format', 'auto');
  
  return url.toString();
}

/**
 * Generate a set of responsive image URLs for different screen sizes
 * @param bucket - The storage bucket name
 * @param path - The path to the image in storage
 * @param sizes - Array of widths to generate
 * @returns Object with srcSet and sizes strings for use in <img> tags
 */
export function getResponsiveImageSrcSet(
  bucket: string,
  path: string,
  sizes = [320, 640, 768, 1024, 1280, 1536]
): { srcSet: string; sizes: string } {
  // Generate srcSet string
  const srcSet = sizes
    .map(size => {
      const url = getResponsiveImageUrl(bucket, path, size);
      return `${url} ${size}w`;
    })
    .join(', ');
  
  // Generate sizes string
  const sizesString = [
    '(max-width: 640px) 100vw',
    '(max-width: 768px) 75vw',
    '(max-width: 1024px) 50vw',
    '33vw'
  ].join(', ');
  
  return {
    srcSet,
    sizes: sizesString
  };
}