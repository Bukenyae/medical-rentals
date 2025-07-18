import { geocodeAddress } from '@/lib/utils/google-maps';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formatted_address: string;
}

/**
 * Geocoding service for converting addresses to coordinates
 */
export class GeocodingService {
  /**
   * Convert an address string to coordinates
   */
  static async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const result = await geocodeAddress(address);
      return result;
    } catch (error) {
      console.error('Geocoding service error:', error);
      return null;
    }
  }

  /**
   * Validate if coordinates are within Baton Rouge area
   */
  static isInBatonRougeArea(lat: number, lng: number): boolean {
    // Baton Rouge approximate bounds
    const bounds = {
      north: 30.6,
      south: 30.3,
      east: -90.9,
      west: -91.3,
    };

    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  }

  /**
   * Format address for consistent display
   */
  static formatAddress(address: string): string {
    return address
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .join(', ');
  }

  /**
   * Extract city and state from formatted address
   */
  static extractCityState(formattedAddress: string): {
    city: string;
    state: string;
  } {
    const parts = formattedAddress.split(',').map(part => part.trim());
    
    // Look for pattern like "Baton Rouge, LA"
    for (let i = 0; i < parts.length - 1; i++) {
      const cityPart = parts[i];
      const statePart = parts[i + 1];
      
      if (statePart.match(/^[A-Z]{2}(\s+\d{5})?$/)) {
        return {
          city: cityPart,
          state: statePart.split(' ')[0], // Remove ZIP if present
        };
      }
    }
    
    return {
      city: '',
      state: '',
    };
  }
}