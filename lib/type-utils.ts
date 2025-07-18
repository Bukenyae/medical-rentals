// Utility functions to handle type conversions between database and TypeScript interfaces

import type { Database } from './database.types'
import type { UserProfile, UserRole } from './types'

// Convert database user profile to TypeScript interface
export function convertDbUserProfile(
  dbProfile: Database['public']['Tables']['user_profiles']['Row']
): UserProfile {
  return {
    id: dbProfile.id,
    first_name: dbProfile.first_name || undefined,
    last_name: dbProfile.last_name || undefined,
    phone: dbProfile.phone || undefined,
    role: (dbProfile.role as UserRole) || 'guest',
    avatar_url: dbProfile.avatar_url || undefined,
    preferences: (dbProfile.preferences as Record<string, any>) || {},
    created_at: dbProfile.created_at,
    updated_at: dbProfile.updated_at
  }
}

// Convert null values to undefined for optional properties
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

// Type guard to check if a value is not null or undefined
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}