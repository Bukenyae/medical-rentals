import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { 
  getRecurringPatterns,
  createRecurringPattern,
  updateRecurringPattern,
  deleteRecurringPattern
} from '@/lib/services/calendar';
import { validatePropertyOwnership } from '@/lib/services/property';
import { ApiError, handleApiError } from '@/lib/utils/api-errors';

// GET /api/properties/[id]/recurring-patterns
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify ownership
    const isOwner = await validatePropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      throw new ApiError('Unauthorized', 'You do not have permission to access this property', 403);
    }
    
    // Get recurring patterns
    const patterns = await getRecurringPatterns(supabase, propertyId);
    
    return NextResponse.json({ data: patterns });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/properties/[id]/recurring-patterns
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify ownership
    const isOwner = await validatePropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      throw new ApiError('Unauthorized', 'You do not have permission to update this property', 403);
    }
    
    const body = await request.json();
    const { 
      name,
      start_date, 
      end_date, 
      days_of_week, 
      is_available, 
      custom_price, 
      notes
    } = body;
    
    // Validate required fields
    if (!name || !start_date || !end_date || !days_of_week || !Array.isArray(days_of_week)) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }
    
    // Create recurring pattern
    const pattern = await createRecurringPattern(
      supabase,
      propertyId,
      name,
      start_date,
      end_date,
      days_of_week,
      is_available,
      custom_price,
      notes
    );
    
    return NextResponse.json({ data: pattern });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/properties/[id]/recurring-patterns?pattern_id=xxx
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('pattern_id');
    
    if (!patternId) {
      return NextResponse.json(
        { error: { message: 'pattern_id is required' } },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify ownership
    const isOwner = await validatePropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      throw new ApiError('Unauthorized', 'You do not have permission to update this property', 403);
    }
    
    const body = await request.json();
    const { 
      name,
      start_date, 
      end_date, 
      days_of_week, 
      is_available, 
      custom_price, 
      notes
    } = body;
    
    // Update recurring pattern
    const pattern = await updateRecurringPattern(
      supabase,
      patternId,
      {
        name,
        start_date,
        end_date,
        days_of_week,
        is_available,
        custom_price,
        notes
      }
    );
    
    return NextResponse.json({ data: pattern });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/properties/[id]/recurring-patterns?pattern_id=xxx
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('pattern_id');
    
    if (!patternId) {
      return NextResponse.json(
        { error: { message: 'pattern_id is required' } },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify ownership
    const isOwner = await validatePropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      throw new ApiError('Unauthorized', 'You do not have permission to update this property', 403);
    }
    
    // Delete recurring pattern
    await deleteRecurringPattern(supabase, patternId);
    
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}