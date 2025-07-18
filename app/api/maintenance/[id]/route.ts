import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { checkPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbac';

// GET /api/maintenance/[id] - Get a specific maintenance task
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    
    // Get the maintenance task
    const { data: task, error } = await supabase
      .from('maintenance_tasks')
      .select(`
        *,
        properties:property_id (
          title,
          address
        )
      `)
      .eq('id', params.id)
      .single();
    
    if (error) {
      console.error('Error fetching maintenance task:', error);
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Maintenance task not found' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Unexpected error in maintenance task GET:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// PATCH /api/maintenance/[id] - Update a maintenance task
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (!checkPermission(session.user.id, PERMISSIONS.MAINTENANCE_UPDATE)) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }
    
    // Parse request body
    const updates = await request.json();
    
    // Check if task exists and user has permission
    const { data: existingTask, error: fetchError } = await supabase
      .from('maintenance_tasks')
      .select('property_id')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !existingTask) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Maintenance task not found' } },
        { status: 404 }
      );
    }
    
    // Check if user owns the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', existingTask.property_id)
      .single();
    
    if (propertyError || !property || property.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'You do not have permission to update this task' } },
        { status: 403 }
      );
    }
    
    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // If status is being updated to completed, set completed_at
    if (updates.status === 'completed' && !updates.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    
    // Update the task
    const { data: updatedTask, error } = await supabase
      .from('maintenance_tasks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating maintenance task:', error);
      return NextResponse.json(
        { error: { code: 'database_error', message: 'Failed to update maintenance task' } },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    console.error('Unexpected error in maintenance task PATCH:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance/[id] - Delete a maintenance task
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (!checkPermission(session.user.id, PERMISSIONS.MAINTENANCE_DELETE)) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }
    
    // Check if task exists and user has permission
    const { data: existingTask, error: fetchError } = await supabase
      .from('maintenance_tasks')
      .select('property_id')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !existingTask) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Maintenance task not found' } },
        { status: 404 }
      );
    }
    
    // Check if user owns the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', existingTask.property_id)
      .single();
    
    if (propertyError || !property || property.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'forbidden', message: 'You do not have permission to delete this task' } },
        { status: 403 }
      );
    }
    
    // Delete the task
    const { error } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('Error deleting maintenance task:', error);
      return NextResponse.json(
        { error: { code: 'database_error', message: 'Failed to delete maintenance task' } },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: { message: 'Maintenance task deleted successfully' } });
  } catch (error) {
    console.error('Unexpected error in maintenance task DELETE:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}