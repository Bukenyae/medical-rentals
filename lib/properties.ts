// Utility functions for property operations

import { createClient } from '@/lib/supabase/client'
import {
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyListResponse,
  PropertyResponse,
  PropertyImageUploadResponse,
  PropertyErrorResponse
} from '@/types/property'
import type { SupabaseClient } from '@supabase/supabase-js'

// Client-side property API functions
export class PropertyAPI {
  private static async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred')
    }
    
    return data
  }

  // Get all properties for the current user
  static async getProperties(): Promise<Property[]> {
    const response = await fetch('/api/properties', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await this.handleResponse<PropertyListResponse>(response)
    return result.data
  }

  // Get a specific property by ID
  static async getProperty(id: string): Promise<Property> {
    const response = await fetch(`/api/properties/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await this.handleResponse<PropertyResponse>(response)
    return result.data
  }

  // Create a new property
  static async createProperty(propertyData: CreatePropertyRequest): Promise<Property> {
    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData),
    })

    const result = await this.handleResponse<PropertyResponse>(response)
    return result.data
  }

  // Update an existing property
  static async updateProperty(id: string, propertyData: UpdatePropertyRequest): Promise<Property> {
    const response = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData),
    })

    const result = await this.handleResponse<PropertyResponse>(response)
    return result.data
  }

  // Delete a property (soft delete)
  static async deleteProperty(id: string): Promise<void> {
    const response = await fetch(`/api/properties/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    await this.handleResponse<{ message: string }>(response)
  }

  // Upload images for a property
  static async uploadPropertyImages(id: string, images: File[]): Promise<{ property: Property; uploadedImages: string[] }> {
    const formData = new FormData()
    images.forEach(image => {
      formData.append('images', image)
    })

    const response = await fetch(`/api/properties/${id}/images`, {
      method: 'POST',
      body: formData,
    })

    const result = await this.handleResponse<PropertyImageUploadResponse>(response)
    return result.data
  }

  // Remove images from a property
  static async removePropertyImages(id: string, imageUrls: string[]): Promise<Property> {
    const response = await fetch(`/api/properties/${id}/images`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrls }),
    })

    const result = await this.handleResponse<PropertyResponse>(response)
    return result.data
  }
}

// Utility functions for property data manipulation
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatAddress(address: Property['address']): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`
}

export function getPropertyImageUrl(property: Property, index: number = 0): string | null {
  if (!property.images || property.images.length === 0) {
    return null
  }
  
  return property.images[index] || property.images[0]
}

export function calculateNightlyRate(basePrice: number, nights: number): number {
  // Basic calculation - can be enhanced with dynamic pricing later
  return basePrice * nights
}

export function getBedroomBathroomText(bedrooms: number, bathrooms: number): string {
  const bedroomText = bedrooms === 1 ? '1 bedroom' : `${bedrooms} bedrooms`
  const bathroomText = bathrooms === 1 ? '1 bathroom' : `${bathrooms} bathrooms`
  
  return `${bedroomText}, ${bathroomText}`
}

// Validation helpers
export function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize
}

export function validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (files.length === 0) {
    errors.push('At least one image is required')
  }
  
  if (files.length > 10) {
    errors.push('Maximum 10 images allowed')
  }
  
  files.forEach((file, index) => {
    if (!isValidImageFile(file)) {
      errors.push(`Image ${index + 1}: Invalid file type or size too large (max 5MB)`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Hospital proximity helpers (placeholder for future implementation)
export function calculateHospitalProximity(propertyAddress: Property['address']): Promise<Record<string, any>> {
  // This will be implemented when we add Google Maps integration
  return Promise.resolve({})
}

export function formatHospitalDistance(distance: { distance_miles: number; drive_time_minutes: number }): string {
  return `${distance.distance_miles.toFixed(1)} miles (${distance.drive_time_minutes} min drive)`
}

// Dashboard-specific helpers
export interface PropertyRow {
  id: string
  owner_id: string
  title: string
  cover_image_url: string | null
  status: 'draft' | 'published' | 'archived'
  updated_at: string
  description?: string | null
}

interface FetchOptions {
  search?: string
  status?: 'published' | 'unpublished'
  limit?: number
  offset?: number
}
export async function fetchProperties(
  client: SupabaseClient,
  ownerId: string,
  { search, status, limit = 12, offset = 0 }: FetchOptions = {},
): Promise<{ data: PropertyRow[]; count: number }>
{
  const from = offset
  const to = offset + limit - 1
  let query = client
    .from('properties')
    .select('id,owner_id,title,cover_image_url,status,updated_at,description', { count: 'exact' })
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (search) query = query.ilike('title', `%${search}%`)
  if (status === 'published') query = query.eq('status', 'published')
  else if (status === 'unpublished') query = query.neq('status', 'published')

  const { data, count, error } = await query
  if (error) throw error
  return { data: (data as PropertyRow[]) ?? [], count: count ?? 0 }
}

export async function deletePropertyRow(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from('properties').delete().eq('id', id)
  if (error) throw error
}
