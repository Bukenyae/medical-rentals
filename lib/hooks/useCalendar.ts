import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/lib/database.types';
import { CalendarAvailability, PropertyAvailability, RecurringPattern } from '@/lib/types';
import { 
  getPropertyAvailability, 
  setDateAvailability, 
  setBulkAvailability,
  setRecurringAvailability,
  deleteAvailability,
  generateDynamicPricing,
  getRecurringPatterns,
  createRecurringPattern,
  updateRecurringPattern,
  deleteRecurringPattern
} from '@/lib/services/calendar';

interface UseCalendarOptions {
  propertyId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function useCalendar({
  propertyId,
  initialStartDate,
  initialEndDate
}: UseCalendarOptions = {}) {
  const supabase = useSupabaseClient<Database>();
  const [availability, setAvailability] = useState<PropertyAvailability[]>([]);
  const [recurringPatterns, setRecurringPatterns] = useState<RecurringPattern[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPatternsLoading, setIsPatternsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: initialStartDate || getDefaultStartDate(),
    endDate: initialEndDate || getDefaultEndDate(),
  });

  // Helper function to get default start date (today)
  function getDefaultStartDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Helper function to get default end date (today + 30 days)
  function getDefaultEndDate(): string {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    return today.toISOString().split('T')[0];
  }

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    if (!propertyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getPropertyAvailability(
        supabase,
        propertyId,
        dateRange.startDate,
        dateRange.endDate
      );
      setAvailability(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch availability');
      console.error('Error fetching availability:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, propertyId, dateRange]);

  // Update date range and refetch
  const updateDateRange = useCallback((startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  }, []);

  // Set availability for a single date
  const updateDateAvailability = useCallback(async (
    date: string,
    isAvailable: boolean | null = null,
    customPrice: number | null = null,
    notes: string | null = null
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await setDateAvailability(
        supabase,
        propertyId,
        date,
        isAvailable,
        customPrice,
        notes
      );
      
      // Update local state
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
      console.error('Error updating availability:', err);
      return null;
    }
  }, [supabase, propertyId, fetchAvailability]);

  // Set availability for multiple dates
  const updateBulkAvailability = useCallback(async (
    dates: string[],
    isAvailable: boolean | null = null,
    customPrice: number | null = null,
    notes: string | null = null
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await setBulkAvailability(
        supabase,
        propertyId,
        dates,
        isAvailable,
        customPrice,
        notes
      );
      
      // Update local state
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bulk availability');
      console.error('Error updating bulk availability:', err);
      return null;
    }
  }, [supabase, propertyId, fetchAvailability]);

  // Set availability based on recurring pattern
  const updateRecurringAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    daysOfWeek: number[] | null = null,
    isAvailable: boolean | null = null,
    customPrice: number | null = null,
    notes: string | null = null
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await setRecurringAvailability(
        supabase,
        propertyId,
        startDate,
        endDate,
        daysOfWeek,
        isAvailable,
        customPrice,
        notes
      );
      
      // Update local state
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recurring availability');
      console.error('Error updating recurring availability:', err);
      return null;
    }
  }, [supabase, propertyId, fetchAvailability]);

  // Remove availability entry
  const removeAvailability = useCallback(async (date: string) => {
    if (!propertyId) return;
    
    setError(null);
    
    try {
      await deleteAvailability(supabase, propertyId, date);
      
      // Update local state
      fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete availability');
      console.error('Error deleting availability:', err);
    }
  }, [supabase, propertyId, fetchAvailability]);

  // Generate dynamic pricing
  const applyDynamicPricing = useCallback(async (
    startDate: string,
    endDate: string,
    demandFactor: number = 1.0
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await generateDynamicPricing(
        supabase,
        propertyId,
        startDate,
        endDate,
        demandFactor
      );
      
      // Update local state
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply dynamic pricing');
      console.error('Error applying dynamic pricing:', err);
      return null;
    }
  }, [supabase, propertyId, fetchAvailability]);

  // Fetch recurring patterns
  const fetchRecurringPatterns = useCallback(async () => {
    if (!propertyId) return;
    
    setIsPatternsLoading(true);
    
    try {
      const patterns = await getRecurringPatterns(supabase, propertyId);
      setRecurringPatterns(patterns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recurring patterns');
      console.error('Error fetching recurring patterns:', err);
    } finally {
      setIsPatternsLoading(false);
    }
  }, [supabase, propertyId]);

  // Create a recurring pattern
  const addRecurringPattern = useCallback(async (
    name: string,
    startDate: string,
    endDate: string,
    daysOfWeek: number[],
    isAvailable: boolean | null = null,
    customPrice: number | null = null,
    notes: string | null = null
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await createRecurringPattern(
        supabase,
        propertyId,
        name,
        startDate,
        endDate,
        daysOfWeek,
        isAvailable,
        customPrice,
        notes
      );
      
      // Update local state
      fetchRecurringPatterns();
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring pattern');
      console.error('Error creating recurring pattern:', err);
      return null;
    }
  }, [supabase, propertyId, fetchRecurringPatterns, fetchAvailability]);

  // Update a recurring pattern
  const editRecurringPattern = useCallback(async (
    patternId: string,
    updates: {
      name?: string;
      start_date?: string;
      end_date?: string;
      days_of_week?: number[];
      is_available?: boolean;
      custom_price?: number | null;
      notes?: string | null;
    }
  ) => {
    if (!propertyId) return null;
    
    setError(null);
    
    try {
      const result = await updateRecurringPattern(
        supabase,
        patternId,
        updates
      );
      
      // Update local state
      fetchRecurringPatterns();
      fetchAvailability();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recurring pattern');
      console.error('Error updating recurring pattern:', err);
      return null;
    }
  }, [supabase, propertyId, fetchRecurringPatterns, fetchAvailability]);

  // Remove a recurring pattern
  const removeRecurringPattern = useCallback(async (patternId: string) => {
    if (!propertyId) return;
    
    setError(null);
    
    try {
      await deleteRecurringPattern(supabase, patternId);
      
      // Update local state
      fetchRecurringPatterns();
      fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recurring pattern');
      console.error('Error deleting recurring pattern:', err);
    }
  }, [supabase, propertyId, fetchRecurringPatterns, fetchAvailability]);

  // Fetch availability and recurring patterns on initial load and when dependencies change
  useEffect(() => {
    fetchAvailability();
    fetchRecurringPatterns();
  }, [fetchAvailability, fetchRecurringPatterns]);

  return {
    availability,
    recurringPatterns,
    isLoading,
    isPatternsLoading,
    error,
    dateRange,
    updateDateRange,
    fetchAvailability,
    fetchRecurringPatterns,
    updateDateAvailability,
    updateBulkAvailability,
    updateRecurringAvailability,
    removeAvailability,
    applyDynamicPricing,
    addRecurringPattern,
    editRecurringPattern,
    removeRecurringPattern
  };
}