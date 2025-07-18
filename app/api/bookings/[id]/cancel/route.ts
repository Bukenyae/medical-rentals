import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { bookingService } from '@/lib/services/booking'
import { ApiResponse } from '@/lib/types'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let canCancel = false

    if (profile?.role === 'admin') {
      canCancel = true
    } else if (profile?.role === 'owner') {
      // Property owners can cancel bookings for their properties
      const { data: property } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', existingBooking.property_id)
        .single()

      canCancel = property?.owner_id === user.id
    } else if (profile?.role === 'guest') {
      // Guests can cancel their own bookings
      canCancel = existingBooking.guest_id === user.id
    }

    if (!canCancel) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Cancel the booking
    const cancelledBooking = await bookingService.cancelBooking(params.id)

    const response: ApiResponse<typeof cancelledBooking> = { data: cancelledBooking }
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error cancelling booking:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: { code: 'BOOKING_ERROR', message: error.message } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel booking' } },
      { status: 500 }
    )
  }
}