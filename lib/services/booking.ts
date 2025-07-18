import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Database } from '@/lib/database.types'
import { 
  CreateBookingInput, 
  UpdateBookingInput, 
  BookingQuery, 
  BookingConflictCheck,
  StatusTransition 
} from '@/lib/validations/booking'
import { Booking } from '@/lib/types'
import { messageService } from './message'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export class BookingService {
  private getSupabase() {
    return createSupabaseServerClient()
  }

  /**
   * Check for booking conflicts
   */
  async checkBookingConflicts(data: BookingConflictCheck): Promise<boolean> {
    const { property_id, check_in, check_out, exclude_booking_id } = data

    const supabase = this.getSupabase()
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('property_id', property_id)
      .in('status', ['confirmed', 'checked_in'])
      .or(`and(check_in.lte.${check_out},check_out.gt.${check_in})`)

    if (exclude_booking_id) {
      query = query.neq('id', exclude_booking_id)
    }

    const { data: conflicts, error } = await query

    if (error) {
      throw new Error(`Failed to check booking conflicts: ${error.message}`)
    }

    return conflicts.length > 0
  }

  /**
   * Calculate total amount for booking
   */
  async calculateBookingAmount(propertyId: string, checkIn: string, checkOut: string): Promise<number> {
    const supabase = this.getSupabase()
    
    // Get property base price
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('base_price')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new Error('Property not found')
    }

    // Calculate number of nights
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    // Check for custom pricing in calendar_availability
    const { data: customPricing } = await supabase
      .from('calendar_availability')
      .select('date, custom_price')
      .eq('property_id', propertyId)
      .gte('date', checkIn)
      .lt('date', checkOut)
      .not('custom_price', 'is', null)

    let totalAmount = 0
    const customPriceMap = new Map(
      customPricing?.map(cp => [cp.date, cp.custom_price]) || []
    )

    // Calculate total for each night
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate)
      currentDate.setDate(currentDate.getDate() + i)
      const dateString = currentDate.toISOString().split('T')[0]
      
      const nightPrice = customPriceMap.get(dateString) || property.base_price
      totalAmount += nightPrice
    }

    return totalAmount
  }

  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingInput, guestId: string): Promise<Booking> {
    // Check for conflicts
    const hasConflicts = await this.checkBookingConflicts({
      property_id: data.property_id,
      check_in: data.check_in,
      check_out: data.check_out
    })

    if (hasConflicts) {
      throw new Error('Booking conflicts with existing reservation')
    }

    const supabase = this.getSupabase()
    
    // Validate guest count against property max_guests
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('max_guests')
      .eq('id', data.property_id)
      .single()

    if (propertyError || !property) {
      throw new Error('Property not found')
    }

    if (data.guest_count > property.max_guests) {
      throw new Error(`Guest count exceeds maximum allowed (${property.max_guests})`)
    }

    // Calculate total amount
    const totalAmount = await this.calculateBookingAmount(
      data.property_id,
      data.check_in,
      data.check_out
    )

    // Create booking
    const bookingData: BookingInsert = {
      property_id: data.property_id,
      guest_id: guestId,
      check_in: data.check_in,
      check_out: data.check_out,
      guest_count: data.guest_count,
      total_amount: totalAmount,
      guest_details: data.guest_details,
      special_requests: data.special_requests,
      status: 'pending'
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create booking: ${error.message}`)
    }

    return this.mapBookingRow(booking)
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: string): Promise<Booking | null> {
    const supabase = this.getSupabase()
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties (
          title,
          address,
          owner_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get booking: ${error.message}`)
    }

    return this.mapBookingRow(booking)
  }

  /**
   * Get bookings with filtering and pagination
   */
  async getBookings(query: BookingQuery = {}): Promise<{ bookings: Booking[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      property_id,
      guest_id,
      status,
      check_in_from,
      check_in_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query

    const supabase = this.getSupabase()
    let supabaseQuery = supabase
      .from('bookings')
      .select(`
        *,
        properties (
          title,
          address
        )
      `, { count: 'exact' })

    // Apply filters
    if (property_id) {
      supabaseQuery = supabaseQuery.eq('property_id', property_id)
    }

    if (guest_id) {
      supabaseQuery = supabaseQuery.eq('guest_id', guest_id)
    }

    if (status) {
      supabaseQuery = supabaseQuery.eq('status', status)
    }

    if (check_in_from) {
      supabaseQuery = supabaseQuery.gte('check_in', check_in_from)
    }

    if (check_in_to) {
      supabaseQuery = supabaseQuery.lte('check_in', check_in_to)
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(sort_by, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    supabaseQuery = supabaseQuery.range(from, to)

    const { data: bookings, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to get bookings: ${error.message}`)
    }

    return {
      bookings: bookings?.map(this.mapBookingRow) || [],
      total: count || 0
    }
  }

  /**
   * Update booking
   */
  async updateBooking(data: UpdateBookingInput): Promise<Booking> {
    const { id, ...updateData } = data

    // If dates are being updated, check for conflicts
    if (updateData.check_in || updateData.check_out) {
      const existingBooking = await this.getBookingById(id)
      if (!existingBooking) {
        throw new Error('Booking not found')
      }

      const checkIn = updateData.check_in || existingBooking.check_in
      const checkOut = updateData.check_out || existingBooking.check_out

      const hasConflicts = await this.checkBookingConflicts({
        property_id: existingBooking.property_id,
        check_in: checkIn,
        check_out: checkOut,
        exclude_booking_id: id
      })

      if (hasConflicts) {
        throw new Error('Updated dates conflict with existing reservation')
      }

      // Recalculate total amount if dates changed
      if (updateData.check_in || updateData.check_out) {
        const newTotalAmount = await this.calculateBookingAmount(
          existingBooking.property_id,
          checkIn,
          checkOut
        )
        updateData.total_amount = newTotalAmount
      }
    }

    // Validate guest count if being updated
    if (updateData.guest_count) {
      const existingBooking = await this.getBookingById(id)
      if (!existingBooking) {
        throw new Error('Booking not found')
      }

      const supabase = this.getSupabase()
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('max_guests')
        .eq('id', existingBooking.property_id)
        .single()

      if (propertyError || !property) {
        throw new Error('Property not found')
      }

      if (updateData.guest_count > property.max_guests) {
        throw new Error(`Guest count exceeds maximum allowed (${property.max_guests})`)
      }
    }

    const supabase = this.getSupabase()
    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`)
    }

    return this.mapBookingRow(booking)
  }

  /**
   * Update booking status with validation
   */
  async updateBookingStatus(data: StatusTransition): Promise<Booking> {
    const { id, to_status } = data

    const booking = await this.getBookingById(id)
    if (!booking) {
      throw new Error('Booking not found')
    }

    // Status transition validation is handled by the schema
    const supabase = this.getSupabase()
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update({ status: to_status })
      .eq('id', id)
      .select(`
        *,
        properties (
          title
        )
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update booking status: ${error.message}`)
    }

    // Send automated messages based on status changes
    try {
      if (to_status === 'confirmed') {
        // Send booking confirmation message
        await messageService.sendBookingConfirmationMessage(
          updatedBooking.id,
          updatedBooking.properties.title,
          updatedBooking.check_in,
          updatedBooking.check_out
        )
      }

      // Schedule check-in instructions message for 2 days before check-in
      if (to_status === 'confirmed') {
        const checkInDate = new Date(updatedBooking.check_in)
        const twoDaysBefore = new Date(checkInDate)
        twoDaysBefore.setDate(checkInDate.getDate() - 2)
        
        // If check-in is more than 2 days away, schedule the message
        // For now, we'll just send it immediately if it's within 2 days
        const now = new Date()
        if (twoDaysBefore <= now) {
          await messageService.sendCheckInInstructionsMessage(
            updatedBooking.id,
            updatedBooking.properties.title,
            updatedBooking.check_in
          )
        }
        // In a production environment, we would use a job scheduler here
      }
    } catch (messageError) {
      console.error('Failed to send automated messages:', messageError)
      // Don't fail the booking status update if messaging fails
    }

    return this.mapBookingRow(updatedBooking)
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.getBookingById(id)
    if (!booking) {
      throw new Error('Booking not found')
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled')
    }

    if (booking.status === 'checked_out') {
      throw new Error('Cannot cancel completed booking')
    }

    return this.updateBookingStatus({
      id,
      from_status: booking.status,
      to_status: 'cancelled'
    })
  }

  /**
   * Delete booking (hard delete - use with caution)
   */
  async deleteBooking(id: string): Promise<void> {
    const supabase = this.getSupabase()
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete booking: ${error.message}`)
    }
  }

  /**
   * Map database row to Booking type
   */
  private mapBookingRow(row: BookingRow): Booking {
    return {
      id: row.id,
      property_id: row.property_id,
      guest_id: row.guest_id,
      check_in: row.check_in,
      check_out: row.check_out,
      guest_count: row.guest_count,
      total_amount: row.total_amount,
      status: row.status,
      guest_details: row.guest_details as any,
      special_requests: row.special_requests || undefined,
      payment_intent_id: row.payment_intent_id || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService()