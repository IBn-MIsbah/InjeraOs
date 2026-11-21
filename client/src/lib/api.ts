import axios, { type InternalAxiosRequestConfig } from 'axios'
import type {
  ActiveSession,
  AuthContextResponse,
  UserProfile,
  RefreshTokenResponse,
  RoleEntity,
  PermissionEntity,
  BusinessEntity,
  BranchEntity,
  TeamMemberEntity,
} from '@/types'
import type { LoginInput, RegisterInput } from '@/schemas'

// Re-export types for backward compatibility
export type {
  ActiveSession,
  AuthContextResponse,
  UserProfile,
  RefreshTokenResponse,
  RoleEntity,
  PermissionEntity,
  BusinessEntity,
  BranchEntity,
  TeamMemberEntity,
}

// In-memory device identifier per browser tab session (no localStorage used)
const sessionDeviceId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}`

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // Guarantees httpOnly, secure cookies are sent with all requests
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Id': sessionDeviceId,
    'X-Device-Name':
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 150)
        : 'Web Client',
  },
})

// Auto-refresh token rotation interceptor
let refreshPromise: Promise<void> | undefined

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined

    if (
      !originalRequest ||
      originalRequest._retried ||
      error.response?.status !== 401 ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      throw error
    }

    originalRequest._retried = true

    refreshPromise ??= api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = undefined
      })

    await refreshPromise
    return api(originalRequest)
  }
)

export const authApi = {
  async register(data: RegisterInput) {
    const res = await api.post<{
      data: AuthContextResponse & { business?: { id: string; name: string } }
    }>('/auth/register', data)
    return res.data.data
  },

  async login(credentials: LoginInput) {
    const res = await api.post<{ data: AuthContextResponse }>(
      '/auth/login',
      credentials
    )
    return res.data.data
  },

  async getMe() {
    const res = await api.get<{ data: AuthContextResponse }>('/auth/me')
    return res.data.data
  },

  async logout() {
    await api.post('/auth/logout')
  },

  async getSessions() {
    const res = await api.get<{ data: ActiveSession[] }>('/auth/sessions')
    return res.data.data
  },

  async revokeSession(sessionId: string) {
    await api.delete(`/auth/sessions/${sessionId}`)
  },

  async revokeOtherSessions() {
    const res = await api.post<{ data: { revokedCount: number } }>(
      '/auth/sessions/revoke-others'
    )
    return res.data.data
  },

  async refresh() {
    const res = await api.post<{ data: RefreshTokenResponse }>('/auth/refresh')
    return res.data.data
  },
}

export const rolesApi = {
  async getRoles() {
    const res = await api.get<{ data: RoleEntity[] }>('/roles')
    return res.data.data
  },

  async getPermissions() {
    const res = await api.get<{ data: PermissionEntity[] }>('/roles/permissions')
    return res.data.data
  },

  async getRole(roleId: string) {
    const res = await api.get<{ data: RoleEntity }>(`/roles/${roleId}`)
    return res.data.data
  },

  async createCustomRole(data: {
    name: string
    description?: string
    permissionCodes?: string[]
  }) {
    const res = await api.post<{ data: RoleEntity }>('/roles', data)
    return res.data.data
  },

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string }
  ) {
    const res = await api.patch<{ data: RoleEntity }>(`/roles/${roleId}`, data)
    return res.data.data
  },

  async setRolePermissions(roleId: string, permissionCodes: string[]) {
    const res = await api.put<{
      data: { roleId: string; permissions: PermissionEntity[] }
    }>(`/roles/${roleId}/permissions`, { permissionCodes })
    return res.data.data
  },

  async assignMemberRole(membershipId: string, roleId: string) {
    const res = await api.patch<{
      data: {
        membershipId: string
        userId: string
        roleId: string
        roleName: string
      }
    }>(`/roles/members/${membershipId}`, { roleId })
    return res.data.data
  },
}

export const businessApi = {
  async getBusiness() {
    const res = await api.get<{ data: BusinessEntity }>('/business')
    return res.data.data
  },

  async updateBusiness(data: Partial<BusinessEntity>) {
    const res = await api.patch<{ data: BusinessEntity }>('/business', data)
    return res.data.data
  },

  async getMembers() {
    const res = await api.get<{ data: TeamMemberEntity[] }>('/business/members')
    return res.data.data
  },

  async inviteMember(data: {
    name: string
    email: string
    roleId: string
    branchIds?: string[]
  }) {
    const res = await api.post<{ data: TeamMemberEntity }>(
      '/business/members/invite',
      data
    )
    return res.data.data
  },
}

export const branchesApi = {
  async getBranches() {
    const res = await api.get<{ data: BranchEntity[] }>('/branches')
    return res.data.data
  },

  async createBranch(data: {
    name: string
    code: string
    address?: string
    phone?: string
    isMain?: boolean
  }) {
    const res = await api.post<{ data: BranchEntity }>('/branches', data)
    return res.data.data
  },

  async updateBranch(branchId: string, data: Partial<BranchEntity>) {
    const res = await api.patch<{ data: BranchEntity }>(
      `/branches/${branchId}`,
      data
    )
    return res.data.data
  },

  async deleteBranch(branchId: string) {
    const res = await api.delete<{ data: BranchEntity }>(`/branches/${branchId}`)
    return res.data.data
  },
}


