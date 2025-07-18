import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { propertyService } from '@/lib/services/property'
import { createPropertySchema, propertyQuerySchema } from '@/lib/validations/property'
import { handleApiError, createAuthError } from '@/lib/utils/api-errors'

// GET /api/properties - Get all properties for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedQuery = propertyQuerySchema.parse(queryParams)
    const result = await propertyService.getProperties(validatedQuery, user.id)

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/properties - Create a new property
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    const body = await request.json()
    const validatedData = createPropertySchema.parse(body)
    
    const property = await propertyService.createProperty(validatedData, user.id)

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}