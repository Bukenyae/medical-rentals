import type { Database } from '../database.types'

// Database types
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']

// Extended types with better typing
export interface PropertyWithDetails extends Omit<Property, 'address' | 'hospital_distances'> {
  address: {
    street: string
    city: string
    state: string
    zip: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  hospital_distances?: Record<string, {
    distance_miles: number
    drive_time_minutes: number
  }>
}

// API response types
export interface PropertyListResponse {
  properties: Property[]
  total: number
  page: number
  limit: number
}

export interface PropertyImageUploadResponse {
  message: string
  imageUrl: string
}

export interface PropertyDeleteResponse {
  message: string
}

// Form types for frontend
export interface PropertyFormData {
  title: string
  description?: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  amenities: string[]
  base_price: number
  max_guests: number
  bedrooms?: number
  bathrooms?: number
  is_active: boolean
}

// Filter and query types
export interface PropertyFilters {
  search?: string
  is_active?: boolean
  min_price?: number
  max_price?: number
  min_guests?: number
  max_guests?: number
  bedrooms?: number
  bathrooms?: number
  hospital_id?: string
  max_distance?: number
}

export interface PropertySortOptions {
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'base_price'
  sort_order?: 'asc' | 'desc'
}

export interface PropertyQueryParams extends PropertyFilters, PropertySortOptions {
  page?: number
  limit?: number
}

// Common amenities list for consistency
export const COMMON_AMENITIES = [
  'WiFi',
  'Kitchen',
  'Washer/Dryer',
  'Parking',
  'Air Conditioning',
  'Heating',
  'TV',
  'Dishwasher',
  'Microwave',
  'Coffee Maker',
  'Refrigerator',
  'Linens Provided',
  'Towels Provided',
  'Hair Dryer',
  'Iron/Ironing Board',
  'Wheelchair Accessible',
  'Pet Friendly',
  'Smoking Allowed',
  'Pool',
  'Gym/Fitness Center',
  'Business Center',
  'Concierge',
  '24/7 Security'
] as const

export type Amenity = typeof COMMON_AMENITIES[number]