import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { generateCleaningTasks } from '@/lib/services/maintenance';
import { Booking } from '@/lib/types';

// This webhook handles booking status changes and creates maintenance tasks as needed
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Verify webhook secret (in a production environment, you would validate a signature or token)
    const authHeader = request.headers.get('authorization');
    if (!process.env.WEBHOOK_SECRET || `Bearer ${process.env.WEBHOOK_SECRET}` !== authHeader) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Invalid webhook secret' } },
        { status: 401 }
      );
    }
    
    // Parse request body
    const { booking, event } = await request.json();
    
    if (!booking || !event) {
      return NextResponse.json(
        { error: { code: 'bad_request', message: 'Missing booking or event data' } },
        { status: 400 }
      );
    }
    
    // Handle different booking events
    switch (event) {
      case 'booking.confirmed':
        // Create pre-arrival inspection task 3 days before check-in
        const checkInDate = new Date(booking.check_in);
        const preArrivalDate = new Date(checkInDate);
        preArrivalDate.setDate(preArrivalDate.getDate() - 3);
        
        await createInspectionTask(
          supabase,
          booking.property_id,
          preArrivalDate.toISOString().split('T')[0],
          'pre-booking',
          `Pre-arrival inspection for booking ${booking.id}`
        );
        break;
        
      case 'booking.checked_out':
        // Create cleaning task for the checkout date
        await createCleaningTask(
          supabase,
          booking.property_id,
          booking.check_out,
          `Cleaning after checkout for booking ${booking.id}`
        );
        
        // Create post-booking inspection task for the day after checkout
        const checkOutDate = new Date(booking.check_out);
        const postCheckoutDate = new Date(checkOutDate);
        postCheckoutDate.setDate(postCheckoutDate.getDate() + 1);
        
        await createInspectionTask(
          supabase,
          booking.property_id,
          postCheckoutDate.toISOString().split('T')[0],
          'post-booking',
          `Post-checkout inspection for booking ${booking.id}`
        );
        break;
        
      case 'booking.cancelled':
        // If a booking is cancelled, we might want to remove any associated tasks
        // This is optional and depends on your business logic
        break;
        
      default:
        // Ignore other events
        break;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in booking status webhook:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// Helper function to create a cleaning task
async function createCleaningTask(
  supabase: any,
  propertyId: string,
  dueDate: string,
  title: string
) {
  try {
    // Get the property owner
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single();
    
    if (!property) {
      console.error('Property not found:', propertyId);
      return;
    }
    
    // Create the cleaning task
    await supabase
      .from('maintenance_tasks')
      .insert({
        property_id: propertyId,
        title,
        description: 'Standard cleaning after guest checkout',
        priority: 'high',
        status: 'pending',
        due_date: dueDate,
        created_by: property.owner_id
      });
  } catch (error) {
    console.error('Error creating cleaning task:', error);
  }
}

// Helper function to create an inspection task
async function createInspectionTask(
  supabase: any,
  propertyId: string,
  dueDate: string,
  inspectionType: 'routine' | 'pre-booking' | 'post-booking' | 'maintenance-followup',
  title: string
) {
  try {
    // Get the property owner
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single();
    
    if (!property) {
      console.error('Property not found:', propertyId);
      return;
    }
    
    // Create the inspection task
    await supabase
      .from('maintenance_tasks')
      .insert({
        property_id: propertyId,
        title,
        description: `${inspectionType} inspection scheduled for ${dueDate}`,
        priority: inspectionType === 'pre-booking' ? 'high' : 'medium',
        status: 'pending',
        due_date: dueDate,
        created_by: property.owner_id
      });
  } catch (error) {
    console.error('Error creating inspection task:', error);
  }
}