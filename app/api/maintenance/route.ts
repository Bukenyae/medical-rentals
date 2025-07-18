import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { CreateMaintenanceTaskData, MaintenanceTask } from '@/lib/types';
import { checkPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac';

// GET /api/maintenance - Get all maintenance tasks for the user's properties
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Not authenticated' } },
        { status: 401 }
      );
    }
    
    // Check permission
    if (!checkPermission(session.user.id, PERMISSIONS.MAINTENANCE_READ)) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }
    
    // Build query
    let query = supabase
      .from('maintenance_tasks')
      .select(`
        *,
        properties:property_id (
          title,
          address
        )
      `);
    
    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    // Execute query
    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching maintenance tasks:', error);
      return NextResponse.json(
        { error: { code: 'database_error', message: 'Failed to fetch maintenance tasks' } },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in maintenance tasks GET:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - Create a new maintenance task
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Not authenticated' } },
        { status: 401 }
      );
    }
    
    // Check permission
    if (!checkPermission(session.user.id, PERMISSIONS.MAINTENANCE_CREATE)) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }
    
    // Parse request body
    const taskData: CreateMaintenanceTaskData = await request.json();
    
    // Validate required fields
    if (!taskData.property_id || !taskData.title) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'Property ID and title are required' } },
        { status: 400 }
      );
    }
    
    // Check if user owns the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', taskData.property_id)
      .single();
    
    if (propertyError || !property) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Property not found' } },
        { status: 404 }
      );
    }
    
    if (property.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'You do not have permission to add tasks to this property' } },
        { status: 403 }
      );
    }
    
    // Create the maintenance task
    const { data: task, error } = await supabase
      .from('maintenance_tasks')
      .insert({
        property_id: taskData.property_id,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority || 'medium',
        assigned_to: taskData.assigned_to || null,
        due_date: taskData.due_date || null,
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating maintenance task:', error);
      return NextResponse.json(
        { error: { code: 'database_error', message: 'Failed to create maintenance task' } },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in maintenance task POST:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}