import axios, { type InternalAxiosRequestConfig } from 'axios'

const deviceStorageKey = 'injera-device-id'
const deviceId = localStorage.getItem(deviceStorageKey) ?? crypto.randomUUID()
localStorage.setItem(deviceStorageKey, deviceId)

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
  headers: { 'X-Device-Id': deviceId, 'X-Device-Name': navigator.userAgent.slice(0, 150) },
})

let refreshPromise: Promise<void> | undefined
api.interceptors.response.use(undefined, async (error) => {
  const request = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (!request || request._retried || error.response?.status !== 401 || request.url?.includes('/auth/refresh')) throw error
  request._retried = true
  refreshPromise ??= api.post('/auth/refresh').then(() => undefined).finally(() => { refreshPromise = undefined })
  await refreshPromise
  return api(request)
})
