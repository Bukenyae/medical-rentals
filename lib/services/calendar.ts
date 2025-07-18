import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { CalendarAvailability, PropertyAvailability, RecurringPattern } from '@/lib/types';

/**
 * Get property availability for a date range
 */
export async function getPropertyAvailability(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyAvailability[]> {
  const { data, error } = await supabase.rpc('get_property_availability', {
    property_uuid: propertyId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    console.error('Error fetching property availability:', error);
    throw new Error(`Failed to fetch property availability: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all recurring patterns for a property
 */
export async function getRecurringPatterns(
  supabase: SupabaseClient<Database>,
  propertyId: string
): Promise<RecurringPattern[]> {
  const { data, error } = await supabase
    .from('recurring_patterns')
    .select('*')
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error fetching recurring patterns:', error);
    throw new Error(`Failed to fetch recurring patterns: ${error.message}`);
  }

  return data || [];
}

/**
 * Set availability for a single date
 */
export async function setDateAvailability(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  date: string,
  isAvailable: boolean | null = null,
  customPrice: number | null = null,
  notes: string | null = null
): Promise<CalendarAvailability> {
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
        is_available: isAvailable,
        custom_price: customPrice,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingData.id)
      .select()
      .single();
  } else {
    // Create new entry
    result = await supabase
      .from('calendar_availability')
      .insert({
        property_id: propertyId,
        date,
        is_available: isAvailable,
        custom_price: customPrice,
        notes,
      })
      .select()
      .single();
  }

  if (result.error) {
    console.error('Error setting date availability:', result.error);
    throw new Error(`Failed to set date availability: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Set availability for multiple dates
 */
export async function setBulkAvailability(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  dates: string[],
  isAvailable: boolean | null = null,
  customPrice: number | null = null,
  notes: string | null = null
): Promise<CalendarAvailability[]> {
  // Process each date
  const updates = dates.map(date => ({
    property_id: propertyId,
    date,
    is_available: isAvailable,
    custom_price: customPrice,
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
    console.error('Error setting bulk availability:', error);
    throw new Error(`Failed to set bulk availability: ${error.message}`);
  }

  return data || [];
}

/**
 * Set availability based on a recurring pattern
 */
export async function setRecurringAvailability(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  startDate: string,
  endDate: string,
  daysOfWeek: number[] | null = null, // 0 = Sunday, 6 = Saturday
  isAvailable: boolean | null = null,
  customPrice: number | null = null,
  notes: string | null = null
): Promise<CalendarAvailability[]> {
  // Generate all dates in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    // If daysOfWeek is specified, only include those days
    if (!daysOfWeek || daysOfWeek.includes(currentDate.getDay())) {
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Use the bulk update function
  return setBulkAvailability(
    supabase,
    propertyId,
    dates,
    isAvailable,
    customPrice,
    notes
  );
}

/**
 * Create a recurring pattern
 */
export async function createRecurringPattern(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  name: string,
  startDate: string,
  endDate: string,
  daysOfWeek: number[], // 0 = Sunday, 6 = Saturday
  isAvailable: boolean | null = null,
  customPrice: number | null = null,
  notes: string | null = null
): Promise<RecurringPattern> {
  // Create the recurring pattern
  const { data, error } = await supabase
    .from('recurring_patterns')
    .insert({
      property_id: propertyId,
      name,
      days_of_week: daysOfWeek,
      start_date: startDate,
      end_date: endDate,
      is_available: isAvailable,
      custom_price: customPrice,
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating recurring pattern:', error);
    throw new Error(`Failed to create recurring pattern: ${error.message}`);
  }

  // Apply the pattern to generate calendar availability entries
  await supabase.rpc('apply_recurring_pattern', {
    pattern_id: data.id
  });

  return data;
}

/**
 * Update a recurring pattern
 */
export async function updateRecurringPattern(
  supabase: SupabaseClient<Database>,
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
): Promise<RecurringPattern> {
  // Update the recurring pattern
  const { data, error } = await supabase
    .from('recurring_patterns')
    .update(updates)
    .eq('id', patternId)
    .select()
    .single();

  if (error) {
    console.error('Error updating recurring pattern:', error);
    throw new Error(`Failed to update recurring pattern: ${error.message}`);
  }

  // Apply the updated pattern
  await supabase.rpc('apply_recurring_pattern', {
    pattern_id: data.id
  });

  return data;
}

/**
 * Delete a recurring pattern
 */
export async function deleteRecurringPattern(
  supabase: SupabaseClient<Database>,
  patternId: string
): Promise<void> {
  const { error } = await supabase
    .from('recurring_patterns')
    .delete()
    .eq('id', patternId);

  if (error) {
    console.error('Error deleting recurring pattern:', error);
    throw new Error(`Failed to delete recurring pattern: ${error.message}`);
  }
}

/**
 * Delete availability entry for a specific date
 */
export async function deleteAvailability(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_availability')
    .delete()
    .eq('property_id', propertyId)
    .eq('date', date);

  if (error) {
    console.error('Error deleting availability:', error);
    throw new Error(`Failed to delete availability: ${error.message}`);
  }
}

/**
 * Calculate dynamic pricing based on various factors
 * This is a simple implementation that can be expanded with more sophisticated algorithms
 */
export function calculateDynamicPrice(
  basePrice: number,
  date: Date,
  demandFactor: number = 1.0
): number {
  // Basic seasonal adjustments
  const month = date.getMonth(); // 0-11
  let seasonalFactor = 1.0;
  
  // Summer months (May-August) have higher prices
  if (month >= 4 && month <= 7) {
    seasonalFactor = 1.2;
  }
  // Winter holidays (December)
  else if (month === 11) {
    seasonalFactor = 1.3;
  }
  // Fall and spring shoulder seasons
  else if (month >= 2 && month <= 3 || month >= 8 && month <= 9) {
    seasonalFactor = 1.1;
  }
  
  // Weekend adjustment (Friday and Saturday)
  const dayOfWeek = date.getDay(); // 0-6
  const weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.15 : 1.0;
  
  // Calculate final price
  const dynamicPrice = basePrice * seasonalFactor * weekendFactor * demandFactor;
  
  // Round to nearest dollar
  return Math.round(dynamicPrice);
}

/**
 * Generate dynamic pricing for a date range
 */
export async function generateDynamicPricing(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  startDate: string,
  endDate: string,
  demandFactor: number = 1.0
): Promise<CalendarAvailability[]> {
  // Get property base price
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('base_price')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    console.error('Error fetching property:', propertyError);
    throw new Error(`Failed to fetch property: ${propertyError?.message}`);
  }

  const basePrice = property.base_price;
  
  // Generate all dates in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const updates: any[] = [];
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0];
    const dynamicPrice = calculateDynamicPrice(basePrice, currentDate, demandFactor);
    
    updates.push({
      property_id: propertyId,
      date: dateString,
      custom_price: dynamicPrice,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
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
    console.error('Error setting dynamic pricing:', error);
    throw new Error(`Failed to set dynamic pricing: ${error.message}`);
  }

  return data || [];
}