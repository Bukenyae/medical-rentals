import { z } from 'zod'

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zip: z.string().min(5, 'ZIP code must be at least 5 characters'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
})

// Hospital distance schema
export const hospitalDistanceSchema = z.record(
  z.string(),
  z.object({
    distance_miles: z.number().positive(),
    drive_time_minutes: z.number().positive()
  })
)

// Property creation schema
export const createPropertySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  address: addressSchema,
  amenities: z.array(z.string()).default([]),
  base_price: z.number().positive('Base price must be positive'),
  max_guests: z.number().int().positive('Max guests must be a positive integer'),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().positive().optional(),
  images: z.array(z.string().url()).default([]),
  hospital_distances: hospitalDistanceSchema.optional(),
  is_active: z.boolean().default(true)
})

// Property update schema (all fields optional except id)
export const updatePropertySchema = z.object({
  id: z.string().uuid('Invalid property ID'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters').optional(),
  description: z.string().optional(),
  address: addressSchema.optional(),
  amenities: z.array(z.string()).optional(),
  base_price: z.number().positive('Base price must be positive').optional(),
  max_guests: z.number().int().positive('Max guests must be a positive integer').optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().positive().optional(),
  images: z.array(z.string().url()).optional(),
  hospital_distances: hospitalDistanceSchema.optional(),
  is_active: z.boolean().optional()
})

// Property query schema
export const propertyQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(val => parseInt(val) || 10).pipe(z.number().int().positive().max(50)).optional(),
  search: z.string().optional(),
  is_active: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'base_price']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  hospital_id: z.string().optional(),
  max_distance: z.string().transform(val => parseFloat(val) || undefined).pipe(z.number().positive().optional())
})

// Image upload schema (for client-side validation)
export const imageUploadSchema = z.object({
  property_id: z.string().uuid('Invalid property ID')
})

// Types derived from schemas
export type CreatePropertyInput = z.infer<typeof createPropertySchema>
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>
export type PropertyQuery = z.infer<typeof propertyQuerySchema>
export type ImageUploadInput = z.infer<typeof imageUploadSchema>
export type Address = z.infer<typeof addressSchema>
export type HospitalDistance = z.infer<typeof hospitalDistanceSchema>