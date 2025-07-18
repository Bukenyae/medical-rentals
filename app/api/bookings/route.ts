import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { bookingService } from '@/lib/services/booking'
import { createBookingSchema, bookingQuerySchema } from '@/lib/validations/booking'
import { ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = bookingQuerySchema.parse(queryParams)

    // Get user role to determine access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If user is a guest, only show their bookings
    if (profile?.role === 'guest') {
      validatedQuery.guest_id = user.id
    }

    const result = await bookingService.getBookings(validatedQuery)

    const response: ApiResponse<typeof result> = { data: result }
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching bookings:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = createBookingSchema.parse(body)

    // Check if user has permission to book this property
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id, is_active')
      .eq('id', validatedData.property_id)
      .single()

    if (!property) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Property not found' } },
        { status: 404 }
      )
    }

    if (!property.is_active) {
      return NextResponse.json(
        { error: { code: 'PROPERTY_INACTIVE', message: 'Property is not available for booking' } },
        { status: 400 }
      )
    }

    // Create booking
    const booking = await bookingService.createBooking(validatedData, user.id)

    const response: ApiResponse<typeof booking> = { data: booking }
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('conflicts') || error.message.includes('exceeds')) {
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
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking' } },
      { status: 500 }
    )
  }
}