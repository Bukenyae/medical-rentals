'use client'

import { useAuth } from '../hooks/useAuth'
import { usePermissions, type Permission } from '../rbac'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: Permission[]
  requireOwner?: boolean
  requireAdmin?: boolean
  fallbackUrl?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireOwner = false,
  requireAdmin = false,
  fallbackUrl = '/auth/signin',
  loadingComponent,
  unauthorizedComponent
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const permissions = usePermissions(user?.profile?.role)

  useEffect(() => {
    if (!loading && !user) {
      router.push(fallbackUrl)
    }
  }, [user, loading, router, fallbackUrl])

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // User not authenticated
  if (!user) {
    return null // Will redirect via useEffect
  }

  // Check admin requirement
  if (requireAdmin && !permissions.isAdmin) {
    return unauthorizedComponent || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Admin access required.</p>
        </div>
      </div>
    )
  }

  // Check owner requirement
  if (requireOwner && !permissions.isOwner) {
    return unauthorizedComponent || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Property owner access required.</p>
        </div>
      </div>
    )
  }

  // Check specific permissions
  if (requiredPermissions.length > 0 && !permissions.hasAllPermissions(requiredPermissions)) {
    return unauthorizedComponent || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have the required permissions.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Convenience wrapper for owner-only routes
export function OwnerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireOwner'>) {
  return (
    <ProtectedRoute requireOwner {...props}>
      {children}
    </ProtectedRoute>
  )
}

// Convenience wrapper for admin-only routes
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireAdmin'>) {
  return (
    <ProtectedRoute requireAdmin {...props}>
      {children}
    </ProtectedRoute>
  )
}