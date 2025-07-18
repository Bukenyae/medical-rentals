import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { bookingService } from '@/lib/services/booking'
import { updateBookingSchema, statusTransitionSchema } from '@/lib/validations/booking'
import { ApiResponse } from '@/lib/types'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const booking = await bookingService.getBookingById(params.id)

    if (!booking) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      )
    }

    // Check if user has permission to view this booking
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Guests can only view their own bookings
    if (profile?.role === 'guest' && booking.guest_id !== user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Property owners can only view bookings for their properties
    if (profile?.role === 'owner') {
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', booking.property_id)
        .single()

      if (property?.owner_id !== user.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied' } },
          { status: 403 }
        )
      }
    }

    const response: ApiResponse<typeof booking> = { data: booking }
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching booking:', error)
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch booking' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateBookingSchema.parse({ ...body, id: params.id })

    // Get existing booking to check permissions
    const existingBooking = await bookingService.getBookingById(params.id)
    if (!existingBooking) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let canUpdate = false

    if (profile?.role === 'admin') {
      canUpdate = true
    } else if (profile?.role === 'owner') {
      // Property owners can update bookings for their properties
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', existingBooking.property_id)
        .single()

      canUpdate = property?.owner_id === user.id
    } else if (profile?.role === 'guest') {
      // Guests can only update their own bookings and only certain fields
      canUpdate = existingBooking.guest_id === user.id
      
      // Guests cannot change status directly (except cancellation)
      if (validatedData.status && validatedData.status !== 'cancelled') {
        canUpdate = false
      }
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Handle status updates with validation
    if (validatedData.status) {
      const statusUpdate = statusTransitionSchema.parse({
        id: params.id,
        from_status: existingBooking.status,
        to_status: validatedData.status
      })

      const booking = await bookingService.updateBookingStatus(statusUpdate)
      const response: ApiResponse<typeof booking> = { data: booking }
      return NextResponse.json(response)
    }

    // Regular update
    const booking = await bookingService.updateBooking(validatedData)

    const response: ApiResponse<typeof booking> = { data: booking }
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error updating booking:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('conflicts') || error.message.includes('exceeds') || error.message.includes('transition')) {
        return NextResponse.json(
          { error: { code: 'BOOKING_CONFLICT', message: error.message } },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update booking' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Get existing booking to check permissions
    const existingBooking = await bookingService.getBookingById(params.id)
    if (!existingBooking) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      )
    }

    // Check permissions - only admins and property owners can delete bookings
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let canDelete = false

    if (profile?.role === 'admin') {
      canDelete = true
    } else if (profile?.role === 'owner') {
      // Property owners can delete bookings for their properties
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', existingBooking.property_id)
        .single()

      canDelete = property?.owner_id === user.id
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Prevent deletion of active bookings
    if (['confirmed', 'checked_in'].includes(existingBooking.status)) {
      return NextResponse.json(
        { error: { code: 'BOOKING_ACTIVE', message: 'Cannot delete active booking. Cancel it first.' } },
        { status: 400 }
      )
    }

    await bookingService.deleteBooking(params.id)

    return NextResponse.json({ data: { message: 'Booking deleted successfully' } })

  } catch (error) {
    console.error('Error deleting booking:', error)
    
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete booking' } },
      { status: 500 }
    )
  }
}