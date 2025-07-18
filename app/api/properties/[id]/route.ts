import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { propertyService } from '@/lib/services/property'
import { updatePropertySchema } from '@/lib/validations/property'
import { handleApiError, createAuthError, createNotFoundError } from '@/lib/utils/api-errors'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/properties/[id] - Get a specific property
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    const property = await propertyService.getProperty(params.id, user.id)

    if (!property) {
      return createNotFoundError('Property')
    }

    return NextResponse.json(property)
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/properties/[id] - Update a specific property
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    const body = await request.json()
    const validatedData = updatePropertySchema.parse({
      id: params.id,
      ...body
    })
    
    const property = await propertyService.updateProperty(validatedData, user.id)

    return NextResponse.json(property)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/properties/[id] - Delete a specific property
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    await propertyService.deleteProperty(params.id, user.id)

    return NextResponse.json(
      { message: 'Property deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}