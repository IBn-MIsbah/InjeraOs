import axios, { type InternalAxiosRequestConfig } from 'axios'

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

    try {
      refreshPromise ??= api
        .post('/auth/refresh')
        .then(() => undefined)
        .finally(() => {
          refreshPromise = undefined
        })

      await refreshPromise
      return api(originalRequest)
    } catch (refreshError) {
      throw refreshError
    }
  }
)

export type UserProfile = {
  id: string
  name: string
  email: string
  phone?: string | null
  createdAt?: string
}

export type AuthContextResponse = {
  user: UserProfile
  businessId: string
  membershipId?: string
  role?: string | null
  permissions: string[]
  sessionId?: string
}

export type ActiveSession = {
  id: string
  deviceId: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  ipAddress?: string | null
  userAgent?: string | null
  isCurrent?: boolean
}

export const authApi = {
  async register(data: {
    name: string
    email: string
    password: string
    phone?: string
    businessName?: string
  }) {
    const res = await api.post<{ data: AuthContextResponse & { business?: { id: string; name: string } } }>(
      '/auth/register',
      data
    )
    return res.data.data
  },

  async login(credentials: { email: string; password: string; businessId?: string }) {
    const res = await api.post<{ data: AuthContextResponse }>('/auth/login', credentials)
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
    const res = await api.post<{ data: { revokedCount: number } }>('/auth/sessions/revoke-others')
    return res.data.data
  },

  async refresh() {
    const res = await api.post<{ data: { accessToken: string } }>('/auth/refresh')
    return res.data.data
  },
}
