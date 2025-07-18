import type { UserRole } from './types'

export interface Permission {
  resource: string
  action: string
}

export const PERMISSIONS = {
  // Property permissions
  PROPERTY_CREATE: { resource: 'property', action: 'create' },
  PROPERTY_READ: { resource: 'property', action: 'read' },
  PROPERTY_UPDATE: { resource: 'property', action: 'update' },
  PROPERTY_DELETE: { resource: 'property', action: 'delete' },
  
  // Booking permissions
  BOOKING_CREATE: { resource: 'booking', action: 'create' },
  BOOKING_READ: { resource: 'booking', action: 'read' },
  BOOKING_UPDATE: { resource: 'booking', action: 'update' },
  BOOKING_DELETE: { resource: 'booking', action: 'delete' },
  
  // Message permissions
  MESSAGE_CREATE: { resource: 'message', action: 'create' },
  MESSAGE_READ: { resource: 'message', action: 'read' },
  
  // Financial permissions
  EXPENSE_CREATE: { resource: 'expense', action: 'create' },
  EXPENSE_READ: { resource: 'expense', action: 'read' },
  EXPENSE_UPDATE: { resource: 'expense', action: 'update' },
  EXPENSE_DELETE: { resource: 'expense', action: 'delete' },
  
  // Maintenance permissions
  MAINTENANCE_CREATE: { resource: 'maintenance', action: 'create' },
  MAINTENANCE_READ: { resource: 'maintenance', action: 'read' },
  MAINTENANCE_UPDATE: { resource: 'maintenance', action: 'update' },
  MAINTENANCE_DELETE: { resource: 'maintenance', action: 'delete' },
  
  // Admin permissions
  USER_MANAGE: { resource: 'user', action: 'manage' },
  SYSTEM_ADMIN: { resource: 'system', action: 'admin' }
} as const

// Define guest permissions first
const GUEST_PERMISSIONS = [
  PERMISSIONS.PROPERTY_READ,
  PERMISSIONS.BOOKING_CREATE,
  PERMISSIONS.BOOKING_READ,
  PERMISSIONS.MESSAGE_CREATE,
  PERMISSIONS.MESSAGE_READ
]

// Define owner permissions (including guest permissions)
const OWNER_PERMISSIONS = [
  ...GUEST_PERMISSIONS,
  PERMISSIONS.PROPERTY_CREATE,
  PERMISSIONS.PROPERTY_UPDATE,
  PERMISSIONS.PROPERTY_DELETE,
  PERMISSIONS.BOOKING_UPDATE,
  PERMISSIONS.BOOKING_DELETE,
  PERMISSIONS.EXPENSE_CREATE,
  PERMISSIONS.EXPENSE_READ,
  PERMISSIONS.EXPENSE_UPDATE,
  PERMISSIONS.EXPENSE_DELETE,
  PERMISSIONS.MAINTENANCE_CREATE,
  PERMISSIONS.MAINTENANCE_READ,
  PERMISSIONS.MAINTENANCE_UPDATE,
  PERMISSIONS.MAINTENANCE_DELETE
]

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  guest: GUEST_PERMISSIONS,
  owner: OWNER_PERMISSIONS,
  admin: Object.values(PERMISSIONS)
}

export class RBACService {
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []
    return rolePermissions.some(
      p => p.resource === permission.resource && p.action === permission.action
    )
  }

  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission))
  }

  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission))
  }

  static canAccessResource(userRole: UserRole, resource: string): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []
    return rolePermissions.some(p => p.resource === resource)
  }

  static getPermissions(userRole: UserRole): Permission[] {
    return ROLE_PERMISSIONS[userRole] || []
  }

  static isOwner(userRole: UserRole): boolean {
    return userRole === 'owner' || userRole === 'admin'
  }

  static isAdmin(userRole: UserRole): boolean {
    return userRole === 'admin'
  }

  static isGuest(userRole: UserRole): boolean {
    return userRole === 'guest'
  }
}

// React hook for permission checking
export function usePermissions(userRole?: UserRole) {
  const hasPermission = (permission: Permission) => {
    if (!userRole) return false
    return RBACService.hasPermission(userRole, permission)
  }

  const hasAnyPermission = (permissions: Permission[]) => {
    if (!userRole) return false
    return RBACService.hasAnyPermission(userRole, permissions)
  }

  const hasAllPermissions = (permissions: Permission[]) => {
    if (!userRole) return false
    return RBACService.hasAllPermissions(userRole, permissions)
  }

  const canAccessResource = (resource: string) => {
    if (!userRole) return false
    return RBACService.canAccessResource(userRole, resource)
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    isOwner: userRole ? RBACService.isOwner(userRole) : false,
    isAdmin: userRole ? RBACService.isAdmin(userRole) : false,
    isGuest: userRole ? RBACService.isGuest(userRole) : false
  }
}