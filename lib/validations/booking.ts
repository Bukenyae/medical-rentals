import { z } from 'zod'

// Guest details schema
export const guestDetailsSchema = z.object({
  name: z.string().min(1, 'Guest name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits'),
  purpose_of_visit: z.string().optional()
})

// Booking creation schema
export const createBookingSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  check_in: z.string().refine((date) => {
    const checkIn = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return checkIn >= today
  }, 'Check-in date must be today or in the future'),
  check_out: z.string(),
  guest_count: z.number().int().positive('Guest count must be a positive integer'),
  guest_details: guestDetailsSchema,
  special_requests: z.string().max(500, 'Special requests must be less than 500 characters').optional()
}).refine((data) => {
  const checkIn = new Date(data.check_in)
  const checkOut = new Date(data.check_out)
  return checkOut > checkIn
}, {
  message: 'Check-out date must be after check-in date',
  path: ['check_out']
}).refine((data) => {
  const checkIn = new Date(data.check_in)
  const checkOut = new Date(data.check_out)
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 365
}, {
  message: 'Booking duration cannot exceed 365 days',
  path: ['check_out']
})

// Booking update schema
export const updateBookingSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
  check_in: z.string().refine((date) => {
    const checkIn = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return checkIn >= today
  }, 'Check-in date must be today or in the future').optional(),
  check_out: z.string().optional(),
  guest_count: z.number().int().positive('Guest count must be a positive integer').optional(),
  guest_details: guestDetailsSchema.optional(),
  special_requests: z.string().max(500, 'Special requests must be less than 500 characters').optional(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']).optional()
}).refine((data) => {
  if (data.check_in && data.check_out) {
    const checkIn = new Date(data.check_in)
    const checkOut = new Date(data.check_out)
    return checkOut > checkIn
  }
  return true
}, {
  message: 'Check-out date must be after check-in date',
  path: ['check_out']
}).refine((data) => {
  if (data.check_in && data.check_out) {
    const checkIn = new Date(data.check_in)
    const checkOut = new Date(data.check_out)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 365
  }
  return true
}, {
  message: 'Booking duration cannot exceed 365 days',
  path: ['check_out']
})

// Booking query schema
export const bookingQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(val => parseInt(val) || 10).pipe(z.number().int().positive().max(50)).optional(),
  property_id: z.string().uuid().optional(),
  guest_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']).optional(),
  check_in_from: z.string().optional(),
  check_in_to: z.string().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'check_in', 'check_out', 'total_amount']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})

// Booking conflict check schema
export const bookingConflictSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  check_in: z.string(),
  check_out: z.string(),
  exclude_booking_id: z.string().uuid().optional() // For updates, exclude current booking
}).refine((data) => {
  const checkIn = new Date(data.check_in)
  const checkOut = new Date(data.check_out)
  return checkOut > checkIn
}, {
  message: 'Check-out date must be after check-in date',
  path: ['check_out']
})

// Status transition validation
export const statusTransitionSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
  from_status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']),
  to_status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'])
}).refine((data) => {
  // Define valid status transitions
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['checked_in', 'cancelled'],
    'checked_in': ['checked_out'],
    'checked_out': [], // Terminal state
    'cancelled': [] // Terminal state
  }
  
  return validTransitions[data.from_status]?.includes(data.to_status) || false
}, {
  message: 'Invalid status transition',
  path: ['to_status']
})

// Types derived from schemas
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type BookingQuery = z.infer<typeof bookingQuerySchema>
export type BookingConflictCheck = z.infer<typeof bookingConflictSchema>
export type StatusTransition = z.infer<typeof statusTransitionSchema>
export type GuestDetails = z.infer<typeof guestDetailsSchema>