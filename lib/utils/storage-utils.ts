import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '../database.types';
import { FileObject } from '@supabase/storage-js';

// Create a Supabase client for use in the browser
const createClient = () => createClientComponentClient<Database>();

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  PROPERTY_IMAGES: 'property-images',
  RECEIPTS: 'receipts',
  DOCUMENTS: 'documents',
};

/**
 * Storage folder structure
 */
export const STORAGE_FOLDERS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

/**
 * Generate a storage path for property images
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @param isPublic - Whether the image should be publicly accessible
 * @returns The storage path
 */
export function getPropertyImagePath(propertyId: string, fileName: string, isPublic = true): string {
  const folder = isPublic ? STORAGE_FOLDERS.PUBLIC : STORAGE_FOLDERS.PRIVATE;
  return `${folder}/${propertyId}/${fileName}`;
}

/**
 * Generate a storage path for property receipts
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @returns The storage path
 */
export function getReceiptPath(propertyId: string, fileName: string): string {
  return `${propertyId}/${fileName}`;
}

/**
 * Generate a storage path for booking documents
 * @param bookingId - The booking ID
 * @param fileName - The file name
 * @returns The storage path
 */
export function getBookingDocumentPath(bookingId: string, fileName: string): string {
  return `${bookingId}/${fileName}`;
}

/**
 * Check if the current user owns the specified property
 * @param propertyId - The property ID to check
 * @returns A promise resolving to a boolean indicating ownership
 */
export async function userOwnsProperty(propertyId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check if the user owns this property
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();
  
  return property?.owner_id === user.id;
}

/**
 * Check if the current user is the guest for the specified booking
 * @param bookingId - The booking ID to check
 * @returns A promise resolving to a boolean indicating if the user is the guest
 */
export async function userIsBookingGuest(bookingId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check if the user is the guest for this booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id')
    .eq('id', bookingId)
    .single();
  
  return booking?.guest_id === user.id;
}

/**
 * Check if the current user has access to the specified property
 * (either as owner or as a guest with an active booking)
 * @param propertyId - The property ID to check
 * @returns A promise resolving to a boolean indicating access
 */
export async function userHasPropertyAccess(propertyId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Check if user is the property owner
  const isOwner = await userOwnsProperty(propertyId);
  if (isOwner) return true;
  
  // Check if user has an active booking for this property
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('property_id', propertyId)
    .eq('guest_id', user.id)
    .in('status', ['confirmed', 'checked_in'])
    .limit(1);
  
  return bookings !== null && bookings.length > 0;
}

/**
 * Upload a property image
 * @param propertyId - The property ID
 * @param file - The file to upload
 * @param isPublic - Whether the image should be publicly accessible
 * @returns A promise resolving to the upload result
 */
export async function uploadPropertyImage(
  propertyId: string, 
  file: File, 
  isPublic = true
): Promise<{ path: string | null; error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { path: null, error: new Error('Unauthorized: You do not own this property') };
  }
  
  // Generate a unique filename to avoid collisions
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${file.name.split('.')[0]}.${fileExt}`;
  
  // Generate the storage path
  const filePath = getPropertyImagePath(propertyId, fileName, isPublic);
  
  // Upload the file
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    return { path: null, error };
  }
  
  // If the upload was successful, return the path
  return { path: data.path, error: null };
}

/**
 * Upload a receipt for a property
 * @param propertyId - The property ID
 * @param file - The file to upload
 * @param description - Optional description of the receipt
 * @returns A promise resolving to the upload result and database entry
 */
export async function uploadPropertyReceipt(
  propertyId: string, 
  file: File,
  description?: string
): Promise<{ path: string | null; error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { path: null, error: new Error('Unauthorized: You do not own this property') };
  }
  
  // Generate a unique filename to avoid collisions
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${file.name.split('.')[0]}.${fileExt}`;
  
  // Generate the storage path
  const filePath = getReceiptPath(propertyId, fileName);
  
  // Upload the file
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.RECEIPTS)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    return { path: null, error };
  }
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create an expense record in the database
  const { error: expenseError } = await supabase
    .from('expenses')
    .insert({
      property_id: propertyId,
      category: 'other', // Default category, can be updated later
      amount: 0, // Default amount, can be updated later
      description: description || `Receipt: ${file.name}`,
      receipt_url: data.path,
      expense_date: new Date().toISOString().split('T')[0],
      created_by: user?.id
    });
  
  if (expenseError) {
    // If there was an error creating the expense record, try to delete the uploaded file
    await supabase.storage
      .from(STORAGE_BUCKETS.RECEIPTS)
      .remove([filePath]);
    
    return { path: null, error: expenseError };
  }
  
  // If everything was successful, return the path
  return { path: data.path, error: null };
}

/**
 * Upload a document for a booking
 * @param bookingId - The booking ID
 * @param file - The file to upload
 * @returns A promise resolving to the upload result
 */
export async function uploadBookingDocument(
  bookingId: string, 
  file: File
): Promise<{ path: string | null; error: Error | null }> {
  const supabase = createClient();
  
  // Get the booking details to check permissions
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id, property_id')
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return { path: null, error: new Error('Booking not found') };
  }
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { path: null, error: new Error('Not authenticated') };
  }
  
  // Check if user is the guest or the property owner
  const isGuest = booking.guest_id === user.id;
  const isOwner = await userOwnsProperty(booking.property_id);
  
  if (!isGuest && !isOwner) {
    return { path: null, error: new Error('Unauthorized: You do not have access to this booking') };
  }
  
  // Generate a unique filename to avoid collisions
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${file.name.split('.')[0]}.${fileExt}`;
  
  // Generate the storage path
  const filePath = getBookingDocumentPath(bookingId, fileName);
  
  // Upload the file
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    return { path: null, error };
  }
  
  // If the upload was successful, return the path
  return { path: data.path, error: null };
}

/**
 * Get property images
 * @param propertyId - The property ID
 * @param isPublic - Whether to get public or private images
 * @returns A promise resolving to the list of images
 */
export async function getPropertyImages(
  propertyId: string,
  isPublic = true
): Promise<{ data: FileObject[] | null; error: Error | null }> {
  const supabase = createClient();
  
  // For public images, no permission check is needed
  if (!isPublic) {
    // For private images, check if user has access
    const hasAccess = await userHasPropertyAccess(propertyId);
    if (!hasAccess) {
      return { data: null, error: new Error('Unauthorized: You do not have access to this property') };
    }
  }
  
  const folder = isPublic ? STORAGE_FOLDERS.PUBLIC : STORAGE_FOLDERS.PRIVATE;
  const path = `${folder}/${propertyId}`;
  
  // List files in the path
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
    .list(path);
  
  if (error) {
    return { data: null, error };
  }
  
  return { data, error: null };
}

/**
 * Get property receipts
 * @param propertyId - The property ID
 * @returns A promise resolving to the list of receipts
 */
export async function getPropertyReceipts(
  propertyId: string
): Promise<{ data: FileObject[] | null; error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { data: null, error: new Error('Unauthorized: You do not own this property') };
  }
  
  // List files in the path
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.RECEIPTS)
    .list(propertyId);
  
  if (error) {
    return { data: null, error };
  }
  
  return { data, error: null };
}

/**
 * Get booking documents
 * @param bookingId - The booking ID
 * @returns A promise resolving to the list of documents
 */
export async function getBookingDocuments(
  bookingId: string
): Promise<{ data: FileObject[] | null; error: Error | null }> {
  const supabase = createClient();
  
  // Get the booking details to check permissions
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id, property_id')
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return { data: null, error: new Error('Booking not found') };
  }
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }
  
  // Check if user is the guest or the property owner
  const isGuest = booking.guest_id === user.id;
  const isOwner = await userOwnsProperty(booking.property_id);
  
  if (!isGuest && !isOwner) {
    return { data: null, error: new Error('Unauthorized: You do not have access to this booking') };
  }
  
  // List files in the path
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .list(bookingId);
  
  if (error) {
    return { data: null, error };
  }
  
  return { data, error: null };
}

/**
 * Get a public URL for a property image
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @param isPublic - Whether the image is public
 * @returns The public URL for the image
 */
export function getPropertyImageUrl(propertyId: string, fileName: string, isPublic = true): string {
  const supabase = createClient();
  const path = getPropertyImagePath(propertyId, fileName, isPublic);
  
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Get a signed URL for a receipt (time-limited access)
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @param expiresIn - Seconds until the URL expires (default: 60 seconds)
 * @returns A promise resolving to the signed URL
 */
export async function getSignedReceiptUrl(
  propertyId: string, 
  fileName: string,
  expiresIn = 60
): Promise<{ url: string | null; error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { url: null, error: new Error('Unauthorized: You do not own this property') };
  }
  
  const path = getReceiptPath(propertyId, fileName);
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.RECEIPTS)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    return { url: null, error };
  }
  
  return { url: data.signedUrl, error: null };
}

/**
 * Get a signed URL for a booking document (time-limited access)
 * @param bookingId - The booking ID
 * @param fileName - The file name
 * @param expiresIn - Seconds until the URL expires (default: 60 seconds)
 * @returns A promise resolving to the signed URL
 */
export async function getSignedDocumentUrl(
  bookingId: string, 
  fileName: string,
  expiresIn = 60
): Promise<{ url: string | null; error: Error | null }> {
  const supabase = createClient();
  
  // Get the booking details to check permissions
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id, property_id')
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return { url: null, error: new Error('Booking not found') };
  }
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { url: null, error: new Error('Not authenticated') };
  }
  
  // Check if user is the guest or the property owner
  const isGuest = booking.guest_id === user.id;
  const isOwner = await userOwnsProperty(booking.property_id);
  
  if (!isGuest && !isOwner) {
    return { url: null, error: new Error('Unauthorized: You do not have access to this booking') };
  }
  
  const path = getBookingDocumentPath(bookingId, fileName);
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    return { url: null, error };
  }
  
  return { url: data.signedUrl, error: null };
}

/**
 * Delete a property image
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @param isPublic - Whether the image is public
 * @returns A promise resolving to the deletion result
 */
export async function deletePropertyImage(
  propertyId: string, 
  fileName: string,
  isPublic = true
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { error: new Error('Unauthorized: You do not own this property') };
  }
  
  const path = getPropertyImagePath(propertyId, fileName, isPublic);
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
    .remove([path]);
  
  return { error };
}

/**
 * Delete a property receipt
 * @param propertyId - The property ID
 * @param fileName - The file name
 * @returns A promise resolving to the deletion result
 */
export async function deletePropertyReceipt(
  propertyId: string, 
  fileName: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  // Check if user owns this property
  const hasAccess = await userOwnsProperty(propertyId);
  if (!hasAccess) {
    return { error: new Error('Unauthorized: You do not own this property') };
  }
  
  const path = getReceiptPath(propertyId, fileName);
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.RECEIPTS)
    .remove([path]);
  
  // If the file was deleted successfully, also update the expense record
  if (!error) {
    await supabase
      .from('expenses')
      .update({ receipt_url: null })
      .eq('receipt_url', path);
  }
  
  return { error };
}

/**
 * Delete a booking document
 * @param bookingId - The booking ID
 * @param fileName - The file name
 * @returns A promise resolving to the deletion result
 */
export async function deleteBookingDocument(
  bookingId: string, 
  fileName: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  // Get the booking details to check permissions
  const { data: booking } = await supabase
    .from('bookings')
    .select('guest_id, property_id')
    .eq('id', bookingId)
    .single();
  
  if (!booking) {
    return { error: new Error('Booking not found') };
  }
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('Not authenticated') };
  }
  
  // Check if user is the property owner (only owners can delete documents)
  const isOwner = await userOwnsProperty(booking.property_id);
  
  if (!isOwner) {
    return { error: new Error('Unauthorized: Only property owners can delete booking documents') };
  }
  
  const path = getBookingDocumentPath(bookingId, fileName);
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .remove([path]);
  
  return { error };
}