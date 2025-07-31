import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/properties - Get all properties for the authenticated user
export async function GET(request: NextRequest) {
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

    // Get properties owned by the user
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch properties' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: properties })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['title', 'address', 'base_price', 'max_guests']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `${field} is required` } },
          { status: 400 }
        )
      }
    }

    // Validate data types
    if (typeof body.base_price !== 'number' || body.base_price <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Base price must be a positive number' } },
        { status: 400 }
      )
    }

    if (typeof body.max_guests !== 'number' || body.max_guests <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Max guests must be a positive number' } },
        { status: 400 }
      )
    }

    // Prepare property data
    const propertyData = {
      owner_id: user.id,
      title: body.title,
      description: body.description || null,
      address: body.address,
      amenities: body.amenities || [],
      base_price: body.base_price,
      max_guests: body.max_guests,
      bedrooms: body.bedrooms || 0,
      bathrooms: body.bathrooms || 0,
      images: body.images || [],
      hospital_distances: body.hospital_distances || {},
      is_active: true
    }

    // Insert property into database
    const { data: property, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to create property' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: property }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}