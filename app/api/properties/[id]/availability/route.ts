import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Database } from '@/lib/database.types';
import { CalendarAvailability } from '@/lib/types';
import { checkPropertyOwnership } from '@/lib/services/property';

// Schema for GET query parameters
const getQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Schema for POST/PUT request body
const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_available: z.boolean().optional(),
  custom_price: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
});

// Schema for bulk update request body
const bulkUpdateSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  is_available: z.boolean().optional(),
  custom_price: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
});

// Schema for recurring pattern request body
const recurringPatternSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days_of_week: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  is_available: z.boolean().optional(),
  custom_price: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
});

// GET /api/properties/[id]/availability
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate query parameters
    const validatedParams = getQuerySchema.safeParse({
      start_date: startDate,
      end_date: endDate,
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: { message: 'Invalid date format. Use YYYY-MM-DD.' } },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Use the database function to get availability
    const { data, error } = await supabase.rpc('get_property_availability', {
      property_uuid: propertyId,
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching property availability:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch property availability' } },
      { status: 500 }
    );
  }
}

// POST /api/properties/[id]/availability
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is the property owner
    const isOwner = await checkPropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: { message: 'Unauthorized: You do not own this property' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Handle different types of availability updates
    switch (action) {
      case 'single':
        return handleSingleUpdate(supabase, propertyId, body);
      case 'bulk':
        return handleBulkUpdate(supabase, propertyId, body);
      case 'recurring':
        return handleRecurringUpdate(supabase, propertyId, body);
      default:
        return NextResponse.json(
          { error: { message: 'Invalid action. Use "single", "bulk", or "recurring".' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating property availability:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update property availability' } },
      { status: 500 }
    );
  }
}

// Helper function for single date update
async function handleSingleUpdate(
  supabase: any,
  propertyId: string,
  body: any
) {
  const validatedData = availabilitySchema.safeParse(body);
  
  if (!validatedData.success) {
    return NextResponse.json(
      { error: { message: 'Invalid data format', details: validatedData.error.format() } },
      { status: 400 }
    );
  }

  const { date, is_available, custom_price, notes } = body;

  // Check if entry already exists
  const { data: existingData } = await supabase
    .from('calendar_availability')
    .select('id')
    .eq('property_id', propertyId)
    .eq('date', date)
    .single();

  let result;
  
  if (existingData) {
    // Update existing entry
    result = await supabase
      .from('calendar_availability')
      .update({
        is_available,
        custom_price,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingData.id)
      .select();
  } else {
    // Create new entry
    result = await supabase
      .from('calendar_availability')
      .insert({
        property_id: propertyId,
        date,
        is_available,
        custom_price,
        notes,
      })
      .select();
  }

  if (result.error) {
    return NextResponse.json(
      { error: { message: result.error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: result.data[0] });
}

// Helper function for bulk update
async function handleBulkUpdate(
  supabase: any,
  propertyId: string,
  body: any
) {
  const validatedData = bulkUpdateSchema.safeParse(body);
  
  if (!validatedData.success) {
    return NextResponse.json(
      { error: { message: 'Invalid data format', details: validatedData.error.format() } },
      { status: 400 }
    );
  }

  const { dates, is_available, custom_price, notes } = body;
  
  // Process each date
  const updates = dates.map(date => ({
    property_id: propertyId,
    date,
    is_available,
    custom_price,
    notes,
  }));

  // Use upsert to handle both inserts and updates
  const { data, error } = await supabase
    .from('calendar_availability')
    .upsert(
      updates,
      {
        onConflict: 'property_id, date',
        ignoreDuplicates: false,
      }
    )
    .select();

  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// Helper function for recurring pattern update
async function handleRecurringUpdate(
  supabase: any,
  propertyId: string,
  body: any
) {
  const validatedData = recurringPatternSchema.safeParse(body);
  
  if (!validatedData.success) {
    return NextResponse.json(
      { error: { message: 'Invalid data format', details: validatedData.error.format() } },
      { status: 400 }
    );
  }

  const { start_date, end_date, days_of_week, is_available, custom_price, notes } = body;
  
  // Generate all dates in the range
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const dates: string[] = [];
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // If days_of_week is specified, only include those days
    if (!days_of_week || days_of_week.includes(currentDate.getDay())) {
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Process each date
  const updates = dates.map(date => ({
    property_id: propertyId,
    date,
    is_available,
    custom_price,
    notes,
  }));

  // Use upsert to handle both inserts and updates
  const { data, error } = await supabase
    .from('calendar_availability')
    .upsert(
      updates,
      {
        onConflict: 'property_id, date',
        ignoreDuplicates: false,
      }
    )
    .select();

  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/properties/[id]/availability
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is the property owner
    const isOwner = await checkPropertyOwnership(supabase, propertyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: { message: 'Unauthorized: You do not own this property' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { error: { message: 'Invalid date format. Use YYYY-MM-DD.' } },
        { status: 400 }
      );
    }

    // Delete the availability entry
    const { error } = await supabase
      .from('calendar_availability')
      .delete()
      .eq('property_id', propertyId)
      .eq('date', date);

    if (error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property availability:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete property availability' } },
      { status: 500 }
    );
  }
}