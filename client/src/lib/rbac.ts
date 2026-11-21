import { useMemo } from 'react'
import type { AppPermission, AppRole } from '../types/enums'
import type { AuthContextResponse } from '../types/auth.types'

/**
 * Check whether a user's role satisfies any of the required roles.
 * Note: The OWNER role always passes any role check.
 */
export function hasRole(
  userRole: AppRole | string | null | undefined,
  allowedRoles: (AppRole | string)[]
): boolean {
  if (!userRole) return false
  if (userRole === 'OWNER') return true
  return allowedRoles.includes(userRole)
}

/**
 * Check whether a user has a specific granular permission or wildcard (*) access.
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: AppPermission | string
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false
  if (userPermissions.includes('*')) return true
  return userPermissions.includes(requiredPermission)
}

/**
 * Check whether a user has at least one of the listed permissions.
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined,
  permissions: (AppPermission | string)[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false
  if (userPermissions.includes('*')) return true
  return permissions.some((perm) => userPermissions.includes(perm))
}

/**
 * Hook to evaluate role access for current auth context
 */
export function useRole(
  auth: AuthContextResponse | null | undefined,
  allowedRoles: (AppRole | string) | (AppRole | string)[]
): boolean {
  const role = auth?.role
  return useMemo(() => {
    if (!role) return false
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    return hasRole(role, roles)
  }, [role, allowedRoles])
}

/**
 * Hook to evaluate single permission access
 */
export function usePermission(
  auth: AuthContextResponse | null | undefined,
  permission: AppPermission | string
): boolean {
  const permissions = auth?.permissions
  return useMemo(() => {
    if (!permissions) return false
    return hasPermission(permissions, permission)
  }, [permissions, permission])
}

/**
 * Hook to evaluate multiple permissions (any matching)
 */
export function useAnyPermission(
  auth: AuthContextResponse | null | undefined,
  permissions: (AppPermission | string)[]
): boolean {
  const userPermissions = auth?.permissions
  return useMemo(() => {
    if (!userPermissions) return false
    return hasAnyPermission(userPermissions, permissions)
  }, [userPermissions, permissions])
}
