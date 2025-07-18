import { useState, useEffect, useCallback } from 'react';
import { 
  MaintenanceTask, 
  CreateMaintenanceTaskData, 
  TaskStatus, 
  TaskPriority 
} from '@/lib/types';
import { 
  getMaintenanceTasks, 
  getMaintenanceTask, 
  createMaintenanceTask, 
  updateMaintenanceTask, 
  deleteMaintenanceTask,
  generateCleaningTasks,
  createInspectionTask,
  recordVendorService,
  VendorServiceRecord
} from '@/lib/services/maintenance';
import { useAuth } from './useAuth';

interface UseMaintenanceOptions {
  propertyId?: string;
  initialStatus?: TaskStatus;
  initialPriority?: TaskPriority;
  autoFetch?: boolean;
}

export function useMaintenance(options: UseMaintenanceOptions = {}) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    propertyId,
    initialStatus,
    initialPriority,
    autoFetch = true
  } = options;
  
  // Fetch all maintenance tasks
  const fetchTasks = useCallback(async (
    status?: TaskStatus,
    priority?: TaskPriority,
    propId?: string
  ) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getMaintenanceTasks(
        propId || propertyId,
        status || initialStatus,
        priority || initialPriority
      );
      
      if (error) {
        setError(error.message);
      } else if (data) {
        setTasks(data);
      }
    } catch (err) {
      setError('Failed to fetch maintenance tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, propertyId, initialStatus, initialPriority]);
  
  // Fetch a single task by ID
  const fetchTask = useCallback(async (id: string) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getMaintenanceTask(id);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        setSelectedTask(data);
        return data;
      }
    } catch (err) {
      setError('Failed to fetch maintenance task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user]);
  
  // Create a new task
  const createTask = useCallback(async (taskData: CreateMaintenanceTaskData) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await createMaintenanceTask(taskData);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        // Refresh the task list
        fetchTasks();
        return data;
      }
    } catch (err) {
      setError('Failed to create maintenance task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user, fetchTasks]);
  
  // Update an existing task
  const updateTask = useCallback(async (id: string, updates: Partial<MaintenanceTask>) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await updateMaintenanceTask(id, updates);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        // Update the task in the list
        setTasks(prev => prev.map(task => task.id === id ? data : task));
        
        // Update selected task if it's the one being updated
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask(data);
        }
        
        return data;
      }
    } catch (err) {
      setError('Failed to update maintenance task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user, selectedTask]);
  
  // Delete a task
  const deleteTask = useCallback(async (id: string) => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await deleteMaintenanceTask(id);
      
      if (error) {
        setError(error.message);
        return false;
      } else {
        // Remove the task from the list
        setTasks(prev => prev.filter(task => task.id !== id));
        
        // Clear selected task if it's the one being deleted
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask(null);
        }
        
        return true;
      }
    } catch (err) {
      setError('Failed to delete maintenance task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return false;
  }, [user, selectedTask]);
  
  // Create a cleaning task after checkout
  const createCleaningTask = useCallback(async (propertyId: string, checkoutDate: string) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await generateCleaningTasks(propertyId, checkoutDate);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        // Refresh the task list
        fetchTasks();
        return data;
      }
    } catch (err) {
      setError('Failed to create cleaning task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user, fetchTasks]);
  
  // Create an inspection task
  const createInspection = useCallback(async (
    propertyId: string,
    dueDate: string,
    inspectionType: 'routine' | 'pre-booking' | 'post-booking' | 'maintenance-followup'
  ) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await createInspectionTask(propertyId, dueDate, inspectionType);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        // Refresh the task list
        fetchTasks();
        return data;
      }
    } catch (err) {
      setError('Failed to create inspection task');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user, fetchTasks]);
  
  // Record vendor service
  const addVendorService = useCallback(async (
    taskId: string,
    serviceRecord: Omit<VendorServiceRecord, 'task_id'>
  ) => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await recordVendorService(taskId, serviceRecord);
      
      if (error) {
        setError(error.message);
        return null;
      } else if (data) {
        // Update the task in the list
        setTasks(prev => prev.map(task => task.id === taskId ? data : task));
        
        // Update selected task if it's the one being updated
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data);
        }
        
        return data;
      }
    } catch (err) {
      setError('Failed to record vendor service');
      console.error(err);
    } finally {
      setLoading(false);
    }
    
    return null;
  }, [user, selectedTask]);
  
  // Initial fetch
  useEffect(() => {
    if (autoFetch && user) {
      fetchTasks();
    }
  }, [autoFetch, user, fetchTasks]);
  
  return {
    tasks,
    selectedTask,
    loading,
    error,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
    createCleaningTask,
    createInspection,
    addVendorService,
    setSelectedTask
  };
}