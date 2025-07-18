import { createSupabaseServerClient } from '../supabase-server'
import type { Database } from '../database.types'
import type { CreatePropertyInput, UpdatePropertyInput, PropertyQuery } from '../validations/property'
import { HospitalProximityService, PropertyHospitalData } from './hospital-proximity'
import { GeocodingService } from './geocoding'

type Property = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export class PropertyService {
  private getSupabase() {
    return createSupabaseServerClient()
  }

  async createProperty(data: CreatePropertyInput, userId: string): Promise<Property> {
    const propertyData: PropertyInsert = {
      title: data.title,
      description: data.description || null,
      address: data.address as any,
      amenities: data.amenities,
      base_price: data.base_price,
      max_guests: data.max_guests,
      bedrooms: data.bedrooms || null,
      bathrooms: data.bathrooms || null,
      images: data.images,
      hospital_distances: data.hospital_distances as any || null,
      is_active: data.is_active,
      owner_id: userId
    }

    const { data: property, error } = await this.getSupabase()
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create property: ${error.message}`)
    }

    return property
  }

  async getProperty(id: string, userId?: string): Promise<Property | null> {
    let query = this.getSupabase()
      .from('properties')
      .select('*')
      .eq('id', id)

    // If userId is provided, filter by owner
    if (userId) {
      query = query.eq('owner_id', userId)
    }

    const { data: property, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Property not found
      }
      throw new Error(`Failed to get property: ${error.message}`)
    }

    return property
  }

  async getProperties(query: PropertyQuery, userId?: string): Promise<{
    properties: Property[]
    total: number
    page: number
    limit: number
  }> {
    const page = query.page || 1
    const limit = query.limit || 10
    const offset = (page - 1) * limit

    let supabaseQuery = this.getSupabase()
      .from('properties')
      .select('*', { count: 'exact' })

    // Filter by owner if userId provided
    if (userId) {
      supabaseQuery = supabaseQuery.eq('owner_id', userId)
    }

    // Apply filters
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`)
    }

    if (query.is_active !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_active', query.is_active)
    }

    // Apply sorting
    const sortBy = query.sort_by || 'created_at'
    const sortOrder = query.sort_order || 'desc'
    supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1)

    const { data: properties, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to get properties: ${error.message}`)
    }

    // Apply hospital proximity filtering if needed
    let filteredProperties = properties || []
    let filteredCount = count || 0
    
    // If hospital proximity filtering is requested
    if (query.hospital_id && query.max_distance && filteredProperties.length > 0) {
      // Filter properties by hospital proximity
      filteredProperties = filteredProperties.filter(property => {
        const hospitalDistances = property.hospital_distances as Record<string, {
          distance_miles: number;
          drive_time_minutes: number;
        }> | null;
        
        if (!hospitalDistances || !hospitalDistances[query.hospital_id!]) {
          return false;
        }
        
        return hospitalDistances[query.hospital_id!].distance_miles <= query.max_distance!;
      });
      
      filteredCount = filteredProperties.length;
    }

    return {
      properties: filteredProperties,
      total: filteredCount,
      page,
      limit
    }
  }

  async updateProperty(data: UpdatePropertyInput, userId: string): Promise<Property> {
    const { id, ...updateData } = data

    const propertyUpdate: PropertyUpdate = {
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.address && { address: updateData.address as any }),
      ...(updateData.amenities && { amenities: updateData.amenities }),
      ...(updateData.base_price && { base_price: updateData.base_price }),
      ...(updateData.max_guests && { max_guests: updateData.max_guests }),
      ...(updateData.bedrooms !== undefined && { bedrooms: updateData.bedrooms }),
      ...(updateData.bathrooms !== undefined && { bathrooms: updateData.bathrooms }),
      ...(updateData.images && { images: updateData.images }),
      ...(updateData.hospital_distances && { hospital_distances: updateData.hospital_distances as any }),
      ...(updateData.is_active !== undefined && { is_active: updateData.is_active }),
      updated_at: new Date().toISOString()
    }

    const { data: property, error } = await this.getSupabase()
      .from('properties')
      .update(propertyUpdate)
      .eq('id', id)
      .eq('owner_id', userId) // Ensure user can only update their own properties
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Property not found or you do not have permission to update it')
      }
      throw new Error(`Failed to update property: ${error.message}`)
    }

    return property
  }

  async deleteProperty(id: string, userId: string): Promise<void> {
    const { error } = await this.getSupabase()
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId) // Ensure user can only delete their own properties

    if (error) {
      throw new Error(`Failed to delete property: ${error.message}`)
    }
  }

  async uploadPropertyImage(file: File, propertyId: string, userId: string): Promise<string> {
    // First verify the user owns the property
    const property = await this.getProperty(propertyId, userId)
    if (!property) {
      throw new Error('Property not found or you do not have permission to upload images')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${propertyId}/${Date.now()}.${fileExt}`

    const { data, error } = await this.getSupabase().storage
      .from('property-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = this.getSupabase().storage
      .from('property-images')
      .getPublicUrl(data.path)

    return publicUrl
  }

  async deletePropertyImage(imagePath: string, propertyId: string, userId: string): Promise<void> {
    // First verify the user owns the property
    const property = await this.getProperty(propertyId, userId)
    if (!property) {
      throw new Error('Property not found or you do not have permission to delete images')
    }

    // Extract path from URL if full URL is provided
    const path = imagePath.includes('/') ? imagePath.split('/').pop() : imagePath

    const { error } = await this.getSupabase().storage
      .from('property-images')
      .remove([`${propertyId}/${path}`])

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  }

  /**
   * Calculate and update hospital proximity data for a property
   */
  async calculateHospitalProximity(propertyId: string, userId: string): Promise<PropertyHospitalData> {
    // Get the property
    const property = await this.getProperty(propertyId, userId)
    if (!property) {
      throw new Error('Property not found or you do not have permission to access it')
    }

    // Extract coordinates from address
    let coordinates: { lat: number; lng: number } | null = null
    
    if (property.address && typeof property.address === 'object') {
      const addressObj = property.address as any
      if (addressObj.coordinates) {
        coordinates = addressObj.coordinates
      }
    }

    // If no coordinates, try to geocode the address
    if (!coordinates && property.address) {
      const addressString = typeof property.address === 'string' 
        ? property.address 
        : (property.address as any).street || ''
      
      if (addressString) {
        const geocodeResult = await GeocodingService.geocodeAddress(addressString)
        if (geocodeResult) {
          coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng }
        }
      }
    }

    if (!coordinates) {
      throw new Error('Unable to determine property coordinates for hospital proximity calculation')
    }

    // Calculate hospital distances
    const proximityData = await HospitalProximityService.calculateAllHospitalDistances(coordinates)
    const hospitalData = HospitalProximityService.formatForDatabase(proximityData)

    // Update the property with hospital distance data
    await this.updateProperty({
      id: propertyId,
      hospital_distances: hospitalData
    }, userId)

    return hospitalData
  }

  /**
   * Get hospital proximity data for a property
   */
  async getHospitalProximity(propertyId: string, userId?: string): Promise<PropertyHospitalData | null> {
    const property = await this.getProperty(propertyId, userId)
    if (!property || !property.hospital_distances) {
      return null
    }

    return property.hospital_distances as PropertyHospitalData
  }

  /**
   * Refresh hospital proximity data for all properties owned by a user
   */
  async refreshAllHospitalProximity(userId: string): Promise<void> {
    const { properties } = await this.getProperties({ page: 1, limit: 100 }, userId)
    
    for (const property of properties) {
      try {
        await this.calculateHospitalProximity(property.id, userId)
      } catch (error) {
        console.error(`Failed to update hospital proximity for property ${property.id}:`, error)
      }
    }
  }
}

export const propertyService = new PropertyService()