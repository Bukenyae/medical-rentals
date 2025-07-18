import { supabase } from '@/lib/supabase';
import { 
  MaintenanceTask, 
  CreateMaintenanceTaskData, 
  ApiResponse,
  TaskStatus,
  TaskPriority
} from '@/lib/types';

// Fetch all maintenance tasks with optional filtering
export async function getMaintenanceTasks(
  propertyId?: string,
  status?: TaskStatus,
  priority?: TaskPriority
): Promise<ApiResponse<MaintenanceTask[]>> {
  try {
    let url = '/api/maintenance';
    const params = new URLSearchParams();
    
    if (propertyId) params.append('property_id', propertyId);
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    return {
      error: {
        code: 'fetch_error',
        message: 'Failed to fetch maintenance tasks'
      }
    };
  }
}

// Fetch a single maintenance task by ID
export async function getMaintenanceTask(id: string): Promise<ApiResponse<MaintenanceTask>> {
  try {
    const response = await fetch(`/api/maintenance/${id}`);
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error(`Error fetching maintenance task ${id}:`, error);
    return {
      error: {
        code: 'fetch_error',
        message: 'Failed to fetch maintenance task'
      }
    };
  }
}

// Create a new maintenance task
export async function createMaintenanceTask(
  taskData: CreateMaintenanceTaskData
): Promise<ApiResponse<MaintenanceTask>> {
  try {
    const response = await fetch('/api/maintenance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    return {
      error: {
        code: 'fetch_error',
        message: 'Failed to create maintenance task'
      }
    };
  }
}

// Update an existing maintenance task
export async function updateMaintenanceTask(
  id: string,
  updates: Partial<MaintenanceTask>
): Promise<ApiResponse<MaintenanceTask>> {
  try {
    const response = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error(`Error updating maintenance task ${id}:`, error);
    return {
      error: {
        code: 'fetch_error',
        message: 'Failed to update maintenance task'
      }
    };
  }
}

// Delete a maintenance task
export async function deleteMaintenanceTask(id: string): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetch(`/api/maintenance/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.error };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error(`Error deleting maintenance task ${id}:`, error);
    return {
      error: {
        code: 'fetch_error',
        message: 'Failed to delete maintenance task'
      }
    };
  }
}

// Generate cleaning tasks based on booking turnover
export async function generateCleaningTasks(
  propertyId: string,
  checkoutDate: string
): Promise<ApiResponse<MaintenanceTask>> {
  try {
    // Create a cleaning task for the property after checkout
    const taskData: CreateMaintenanceTaskData = {
      property_id: propertyId,
      title: `Cleaning after checkout on ${new Date(checkoutDate).toLocaleDateString()}`,
      description: 'Standard cleaning after guest checkout',
      priority: 'high',
      due_date: checkoutDate
    };
    
    return await createMaintenanceTask(taskData);
  } catch (error) {
    console.error('Error generating cleaning task:', error);
    return {
      error: {
        code: 'processing_error',
        message: 'Failed to generate cleaning task'
      }
    };
  }
}

// Create a property inspection task
export async function createInspectionTask(
  propertyId: string,
  dueDate: string,
  inspectionType: 'routine' | 'pre-booking' | 'post-booking' | 'maintenance-followup'
): Promise<ApiResponse<MaintenanceTask>> {
  try {
    const titles = {
      'routine': 'Routine property inspection',
      'pre-booking': 'Pre-booking property inspection',
      'post-booking': 'Post-booking property inspection',
      'maintenance-followup': 'Maintenance follow-up inspection'
    };
    
    const taskData: CreateMaintenanceTaskData = {
      property_id: propertyId,
      title: titles[inspectionType],
      description: `${inspectionType} inspection scheduled for ${new Date(dueDate).toLocaleDateString()}`,
      priority: inspectionType === 'pre-booking' ? 'high' : 'medium',
      due_date: dueDate
    };
    
    return await createMaintenanceTask(taskData);
  } catch (error) {
    console.error('Error creating inspection task:', error);
    return {
      error: {
        code: 'processing_error',
        message: 'Failed to create inspection task'
      }
    };
  }
}

// Create a vendor service record
export interface VendorServiceRecord {
  task_id: string;
  vendor_name: string;
  service_type: string;
  service_date: string;
  cost: number;
  notes?: string;
}

export async function recordVendorService(
  taskId: string,
  serviceRecord: Omit<VendorServiceRecord, 'task_id'>
): Promise<ApiResponse<MaintenanceTask>> {
  try {
    // First, get the task to ensure it exists
    const { data: task, error } = await getMaintenanceTask(taskId);
    
    if (error || !task) {
      return { error: error || { code: 'not_found', message: 'Task not found' } };
    }
    
    // Update the task with vendor information
    const updates = {
      status: 'completed' as TaskStatus,
      description: task.description ? 
        `${task.description}\n\nVendor: ${serviceRecord.vendor_name}\nService: ${serviceRecord.service_type}\nDate: ${serviceRecord.service_date}\nCost: $${serviceRecord.cost}` : 
        `Vendor: ${serviceRecord.vendor_name}\nService: ${serviceRecord.service_type}\nDate: ${serviceRecord.service_date}\nCost: $${serviceRecord.cost}`,
      completed_at: new Date().toISOString()
    };
    
    // If there are notes, add them
    if (serviceRecord.notes) {
      updates.description += `\nNotes: ${serviceRecord.notes}`;
    }
    
    // Update the task
    return await updateMaintenanceTask(taskId, updates);
  } catch (error) {
    console.error('Error recording vendor service:', error);
    return {
      error: {
        code: 'processing_error',
        message: 'Failed to record vendor service'
      }
    };
  }
}