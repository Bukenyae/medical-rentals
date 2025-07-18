import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { propertyService } from '@/lib/services/property'
import { handleApiError, createAuthError, ApiError } from '@/lib/utils/api-errors'

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/properties/[id]/images - Upload property image
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new ApiError('No file provided', 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new ApiError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400)
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new ApiError('File size too large. Maximum size is 5MB.', 400)
    }

    const imageUrl = await propertyService.uploadPropertyImage(file, params.id, user.id)

    return NextResponse.json({ 
      message: 'Image uploaded successfully',
      imageUrl 
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/properties/[id]/images - Delete property image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createAuthError()
    }

    const { searchParams } = new URL(request.url)
    const imagePath = searchParams.get('path')

    if (!imagePath) {
      throw new ApiError('Image path is required', 400)
    }

    await propertyService.deletePropertyImage(imagePath, params.id, user.id)

    return NextResponse.json({ 
      message: 'Image deleted successfully' 
    }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}