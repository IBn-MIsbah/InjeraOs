import React from 'react'
import type { AppPermission, AppRole } from '@/types/enums'
import type { AuthContextResponse } from '@/types/auth.types'
import { hasAnyPermission, hasPermission, hasRole } from '@/lib/rbac'

interface GuardProps {
  auth: AuthContextResponse | null | undefined
  role?: (AppRole | string) | (AppRole | string)[]
  permission?: (AppPermission | string) | (AppPermission | string)[]
  requireAllPermissions?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative component to render child content only if the user satisfies
 * role and/or permission constraints.
 */
export function Guard({
  auth,
  role,
  permission,
  requireAllPermissions = false,
  fallback = null,
  children,
}: GuardProps) {
  if (!auth) return <>{fallback}</>

  // Check role constraints if specified
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    if (!hasRole(auth.role, roles)) {
      return <>{fallback}</>
    }
  }

  // Check permission constraints if specified
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    if (requireAllPermissions) {
      const satisfiesAll = perms.every((p) => hasPermission(auth.permissions, p))
      if (!satisfiesAll) return <>{fallback}</>
    } else {
      if (!hasAnyPermission(auth.permissions, perms)) {
        return <>{fallback}</>
      }
    }
  }

  return <>{children}</>
}
