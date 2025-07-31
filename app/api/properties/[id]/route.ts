import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/properties/[id] - Get a specific property
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { id } = params

    // Get property by ID (only if owned by user)
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Property not found' } },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch property' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: property })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// PUT /api/properties/[id] - Update a specific property
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()

    // Validate data types if provided
    if (body.base_price !== undefined) {
      if (typeof body.base_price !== 'number' || body.base_price <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Base price must be a positive number' } },
          { status: 400 }
        )
      }
    }

    if (body.max_guests !== undefined) {
      if (typeof body.max_guests !== 'number' || body.max_guests <= 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Max guests must be a positive number' } },
          { status: 400 }
        )
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {}
    const allowedFields = [
      'title', 'description', 'address', 'amenities', 'base_price', 
      'max_guests', 'bedrooms', 'bathrooms', 'images', 'hospital_distances'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Update property (only if owned by user)
    const { data: property, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Property not found' } },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to update property' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: property })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// DELETE /api/properties/[id] - Delete a specific property (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { id } = params

    // Check if property has active bookings
    const { data: activeBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('property_id', id)
      .in('status', ['pending', 'confirmed', 'checked_in'])

    if (bookingError) {
      console.error('Database error checking bookings:', bookingError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to check property bookings' } },
        { status: 500 }
      )
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Cannot delete property with active bookings' } },
        { status: 409 }
      )
    }

    // Soft delete property (set is_active to false)
    const { data: property, error } = await supabase
      .from('properties')
      .update({ is_active: false })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Property not found' } },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to delete property' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Property deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}