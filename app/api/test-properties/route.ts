import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/test-properties - Test endpoint to verify property API functionality
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication required to test property API',
        authenticated: false
      })
    }

    // Test database connection
    const { data: properties, error: dbError } = await supabase
      .from('properties')
      .select('id, title, created_at')
      .eq('owner_id', user.id)
      .limit(5)

    if (dbError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: dbError.message,
        authenticated: true
      })
    }

    // Test storage bucket access
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    const hasPropertyImagesBucket = buckets?.some(bucket => bucket.name === 'property-images')

    return NextResponse.json({
      status: 'success',
      message: 'Property API is ready',
      data: {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email
        },
        database: {
          connected: true,
          propertiesCount: properties?.length || 0,
          sampleProperties: properties?.map(p => ({ id: p.id, title: p.title })) || []
        },
        storage: {
          connected: !storageError,
          hasPropertyImagesBucket,
          error: storageError?.message
        },
        endpoints: {
          'GET /api/properties': 'List all properties',
          'POST /api/properties': 'Create new property',
          'GET /api/properties/[id]': 'Get specific property',
          'PUT /api/properties/[id]': 'Update property',
          'DELETE /api/properties/[id]': 'Delete property',
          'POST /api/properties/[id]/images': 'Upload property images',
          'DELETE /api/properties/[id]/images': 'Remove property images'
        }
      }
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}