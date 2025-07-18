/**
 * Utility functions for responsive image handling
 */

/**
 * Generate responsive image sizes attribute based on layout
 * @param layout The layout of the image (card, full, etc.)
 * @returns The sizes attribute string
 */
export function getResponsiveImageSizes(layout: 'card' | 'full' | 'thumbnail' | 'gallery' = 'card'): string {
  switch (layout) {
    case 'full':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 1200px';
    case 'card':
      return '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';
    case 'thumbnail':
      return '(max-width: 640px) 25vw, 150px';
    case 'gallery':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    default:
      return '100vw';
  }
}

/**
 * Generate image loading priority based on visibility
 * @param isAboveFold Whether the image is above the fold
 * @returns Object with priority and loading attributes
 */
export function getImageLoadingPriority(isAboveFold: boolean = false): {
  priority: boolean;
  loading: 'eager' | 'lazy';
} {
  return {
    priority: isAboveFold,
    loading: isAboveFold ? 'eager' : 'lazy',
  };
}

/**
 * Generate a placeholder image URL for when images fail to load
 * @param type The type of placeholder (property, user, etc.)
 * @returns The placeholder image URL
 */
export function getPlaceholderImage(type: 'property' | 'user' | 'generic' = 'generic'): string {
  switch (type) {
    case 'property':
      return '/icons/property-placeholder.svg';
    case 'user':
      return '/icons/user-placeholder.svg';
    default:
      return '/icons/icon-192x192.png';
  }
}