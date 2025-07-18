import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { 
  getPropertyAvailability, 
  setDateAvailability, 
  setBulkAvailability,
  setRecurringAvailability,
  deleteAvailability,
  generateDynamicPricing
} from '@/lib/services/calendar';
import { validatePropertyOwnership } from '@/lib/services/property';
import { ApiError, handleApiError } from '@/lib/utils/api-errors';

// GET /api/properties/[id]/calendar?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: { message: 'start_date and end_date are required' } },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get property availability
    const availability = await getPropertyAvailability(
      supabase,
      propertyId,
      startDate,
      endDate
    );

    return NextResponse.json({ data: availability });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/properties/[id]/calendar
// Body: { date, is_available, custom_price, notes } for single date
// or { dates, is_available, custom_price, notes } for bulk update
// or { start_date, end_date, days_of_week, is_available, custom_price, notes } for recurring pattern
// or { start_date, end_date, demand_factor } for dynamic pricing
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
      date, 
      dates, 
      start_date, 
      end_date, 
      days_of_week, 
      is_available, 
      custom_price, 
      notes,
      demand_factor,
      operation_type
    } = body;
    
    let result;
    
    // Determine operation type
    if (operation_type === 'dynamic_pricing') {
      // Dynamic pricing operation
      if (!start_date || !end_date) {
        return NextResponse.json(
          { error: { message: 'start_date and end_date are required for dynamic pricing' } },
          { status: 400 }
        );
      }
      
      result = await generateDynamicPricing(
        supabase,
        propertyId,
        start_date,
        end_date,
        demand_factor || 1.0
      );
    } else if (operation_type === 'recurring') {
      // Recurring pattern operation
      if (!start_date || !end_date) {
        return NextResponse.json(
          { error: { message: 'start_date and end_date are required for recurring patterns' } },
          { status: 400 }
        );
      }
      
      result = await setRecurringAvailability(
        supabase,
        propertyId,
        start_date,
        end_date,
        days_of_week,
        is_available,
        custom_price,
        notes
      );
    } else if (dates && Array.isArray(dates)) {
      // Bulk update operation
      result = await setBulkAvailability(
        supabase,
        propertyId,
        dates,
        is_available,
        custom_price,
        notes
      );
    } else if (date) {
      // Single date operation
      result = await setDateAvailability(
        supabase,
        propertyId,
        date,
        is_available,
        custom_price,
        notes
      );
    } else {
      return NextResponse.json(
        { error: { message: 'Invalid request body' } },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/properties/[id]/calendar?date=YYYY-MM-DD
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: { message: 'date parameter is required' } },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify ownership
    const isOwner = await validatePropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      throw new ApiError('Unauthorized', 'You do not have permission to update this property', 403);
    }
    
    await deleteAvailability(supabase, propertyId, date);
    
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}