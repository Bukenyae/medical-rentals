// Property-related TypeScript interfaces and types

export interface PropertyAddress {
  street: string
  city: string
  state: string
  zip: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface HospitalDistance {
  distance_miles: number
  drive_time_minutes: number
}

export interface Property {
  id: string
  owner_id: string
  title: string
  description: string | null
  address: PropertyAddress
  amenities: string[]
  base_price: number
  max_guests: number
  bedrooms: number
  bathrooms: number
  images: string[]
  hospital_distances: Record<string, HospitalDistance>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePropertyRequest {
  title: string
  description?: string
  address: PropertyAddress
  amenities?: string[]
  base_price: number
  max_guests: number
  bedrooms?: number
  bathrooms?: number
  images?: string[]
  hospital_distances?: Record<string, HospitalDistance>
}

export interface UpdatePropertyRequest {
  title?: string
  description?: string
  address?: PropertyAddress
  amenities?: string[]
  base_price?: number
  max_guests?: number
  bedrooms?: number
  bathrooms?: number
  images?: string[]
  hospital_distances?: Record<string, HospitalDistance>
}

export interface PropertyListResponse {
  data: Property[]
}

export interface PropertyResponse {
  data: Property
}

export interface PropertyImageUploadResponse {
  data: {
    property: Property
    uploadedImages: string[]
  }
}

// Common amenities for properties
export const COMMON_AMENITIES = [
  'WiFi',
  'Kitchen',
  'Washer',
  'Dryer',
  'Air conditioning',
  'Heating',
  'TV',
  'Parking',
  'Pool',
  'Hot tub',
  'Gym',
  'Elevator',
  'Wheelchair accessible',
  'Pet friendly',
  'Smoking allowed',
  'Suitable for events',
  'Family/kid friendly',
  'First aid kit',
  'Fire extinguisher',
  'Carbon monoxide alarm',
  'Smoke alarm'
] as const

export type PropertyAmenity = typeof COMMON_AMENITIES[number]

// Validation functions
export function validatePropertyAddress(address: any): address is PropertyAddress {
  return (
    typeof address === 'object' &&
    typeof address.street === 'string' &&
    typeof address.city === 'string' &&
    typeof address.state === 'string' &&
    typeof address.zip === 'string' &&
    address.street.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    address.zip.trim().length > 0
  )
}

export function validateCreatePropertyRequest(data: any): data is CreatePropertyRequest {
  return (
    typeof data === 'object' &&
    typeof data.title === 'string' &&
    data.title.trim().length > 0 &&
    validatePropertyAddress(data.address) &&
    typeof data.base_price === 'number' &&
    data.base_price > 0 &&
    typeof data.max_guests === 'number' &&
    data.max_guests > 0 &&
    (data.description === undefined || typeof data.description === 'string') &&
    (data.amenities === undefined || Array.isArray(data.amenities)) &&
    (data.bedrooms === undefined || (typeof data.bedrooms === 'number' && data.bedrooms >= 0)) &&
    (data.bathrooms === undefined || (typeof data.bathrooms === 'number' && data.bathrooms >= 0)) &&
    (data.images === undefined || Array.isArray(data.images)) &&
    (data.hospital_distances === undefined || typeof data.hospital_distances === 'object')
  )
}

export function validateUpdatePropertyRequest(data: any): data is UpdatePropertyRequest {
  const hasValidFields = Object.keys(data).every(key => {
    switch (key) {
      case 'title':
        return typeof data.title === 'string' && data.title.trim().length > 0
      case 'description':
        return data.description === null || typeof data.description === 'string'
      case 'address':
        return validatePropertyAddress(data.address)
      case 'amenities':
        return Array.isArray(data.amenities)
      case 'base_price':
        return typeof data.base_price === 'number' && data.base_price > 0
      case 'max_guests':
        return typeof data.max_guests === 'number' && data.max_guests > 0
      case 'bedrooms':
        return typeof data.bedrooms === 'number' && data.bedrooms >= 0
      case 'bathrooms':
        return typeof data.bathrooms === 'number' && data.bathrooms >= 0
      case 'images':
        return Array.isArray(data.images)
      case 'hospital_distances':
        return typeof data.hospital_distances === 'object'
      default:
        return false
    }
  })

  return typeof data === 'object' && hasValidFields
}

// Error types
export interface PropertyError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp?: string
}

export interface PropertyErrorResponse {
  error: PropertyError
}