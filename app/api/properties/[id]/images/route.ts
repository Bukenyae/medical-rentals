import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/properties/[id]/images - Upload property images
export async function POST(
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

    const { id: propertyId } = params

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, images')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single()

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Property not found' } },
          { status: 404 }
        )
      }
      console.error('Database error:', propertyError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to verify property ownership' } },
        { status: 500 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No images provided' } },
        { status: 400 }
      )
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxFileSize = 5 * 1024 * 1024 // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' } },
          { status: 400 }
        )
      }

      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'File size too large. Maximum 5MB per image' } },
          { status: 400 }
        )
      }
    }

    // Upload images to Supabase Storage
    const uploadedImages: string[] = []
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${propertyId}/${Date.now()}-${index}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        throw new Error(`Failed to upload ${file.name}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName)

      return publicUrl
    })

    try {
      const imageUrls = await Promise.all(uploadPromises)
      uploadedImages.push(...imageUrls)
    } catch (uploadError) {
      console.error('Image upload failed:', uploadError)
      return NextResponse.json(
        { error: { code: 'UPLOAD_ERROR', message: 'Failed to upload one or more images' } },
        { status: 500 }
      )
    }

    // Update property with new image URLs
    const updatedImages = [...(property.images || []), ...uploadedImages]
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({ images: updatedImages })
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to update property with new images' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: { 
        property: updatedProperty,
        uploadedImages: uploadedImages 
      } 
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// DELETE /api/properties/[id]/images - Remove property images
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

    const { id: propertyId } = params
    const { imageUrls } = await request.json()

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Image URLs array is required' } },
        { status: 400 }
      )
    }

    // Verify property ownership and get current images
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, images')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single()

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Property not found' } },
          { status: 404 }
        )
      }
      console.error('Database error:', propertyError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to verify property ownership' } },
        { status: 500 }
      )
    }

    // Remove images from storage
    const deletePromises = imageUrls.map(async (imageUrl: string) => {
      // Extract file path from URL
      const urlParts = imageUrl.split('/property-images/')
      if (urlParts.length === 2) {
        const filePath = urlParts[1]
        const { error } = await supabase.storage
          .from('property-images')
          .remove([filePath])
        
        if (error) {
          console.error('Storage delete error:', error)
        }
      }
    })

    await Promise.all(deletePromises)

    // Update property images array
    const updatedImages = (property.images || []).filter(
      (img: string) => !imageUrls.includes(img)
    )

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({ images: updatedImages })
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to update property images' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: updatedProperty,
      message: 'Images removed successfully' 
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}