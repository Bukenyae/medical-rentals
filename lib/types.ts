// TypeScript type definitions for the rental property platform

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export type MessageType = 'user' | 'system' | 'chatbot';

export type ExpenseCategory = 'maintenance' | 'cleaning' | 'utilities' | 'supplies' | 'marketing' | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type UserRole = 'guest' | 'owner' | 'admin';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface HospitalDistance {
  distance_miles: number;
  drive_time_minutes: number;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  address: Address;
  amenities: string[];
  base_price: number;
  max_guests: number;
  bedrooms?: number;
  bathrooms?: number;
  images: string[];
  hospital_distances: Record<string, HospitalDistance>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  purpose_of_visit?: string;
}

export interface Booking {
  id: string;
  property_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  total_amount: number;
  status: BookingStatus;
  guest_details?: GuestDetails;
  special_requests?: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id?: string;
  sender_id?: string;
  recipient_id?: string;
  content: string;
  message_type: MessageType;
  read_at?: string;
  chat_session_id?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  property_id: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: string;
  property_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarAvailability {
  id: string;
  property_id: string;
  date: string;
  is_available: boolean;
  custom_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringPattern {
  id: string;
  property_id: string;
  name: string;
  days_of_week: number[]; // 0 = Sunday, 6 = Saturday
  start_date: string;
  end_date: string;
  is_available: boolean;
  custom_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Database function return types
export interface PropertyAvailability {
  date: string;
  is_available: boolean;
  price: number;
  is_booked: boolean;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Form types for creating/updating records
export interface CreatePropertyData {
  title: string;
  description?: string;
  address: Address;
  amenities: string[];
  base_price: number;
  max_guests: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
}

export interface CreateBookingData {
  property_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  guest_details: GuestDetails;
  special_requests?: string;
}

export interface CreateExpenseData {
  property_id: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  receipt_url?: string;
  expense_date: string;
}

export interface CreateMaintenanceTaskData {
  property_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
}

export interface CreateMessageData {
  booking_id?: string;
  recipient_id?: string;
  sender_id?: string;
  content: string;
  message_type?: MessageType;
  chat_session_id?: string;
}