import type { AppRole } from './enums'

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BusinessSummary {
  id: string
  name: string
  currency?: string
}

export interface PermissionEntity {
  id: string
  code: string
  description?: string | null
}

export interface RoleEntity {
  id: string
  businessId?: string | null
  name: string
  description?: string | null
  isSystem: boolean
  permissions: PermissionEntity[]
}

export interface AuthContextResponse {
  user: UserProfile
  businessId: string
  business?: BusinessSummary
  membershipId?: string
  role?: AppRole | string | null
  permissions: string[]
  sessionId?: string
}

export interface ActiveSession {
  id: string
  deviceId: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  ipAddress?: string | null
  userAgent?: string | null
  isCurrent?: boolean
}

export interface RefreshTokenResponse {
  accessToken: string
}
