import { useEffect, useState } from 'react'
import { syncEngine } from './sync-engine'

export interface NetworkStatus {
  isOnline: boolean
  isServerReachable: boolean
  pendingQueueCount: number
  lastCheckedAt: Date | null
}

let globalNetworkStatus: NetworkStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isServerReachable: true,
  pendingQueueCount: 0,
  lastCheckedAt: null,
}

const listeners = new Set<(status: NetworkStatus) => void>()

function notifyListeners() {
  const current = { ...globalNetworkStatus }
  listeners.forEach((listener) => listener(current))
}

export function updateNetworkStatus(partial: Partial<NetworkStatus>) {
  globalNetworkStatus = { ...globalNetworkStatus, ...partial }
  notifyListeners()
}

/**
 * Probes the backend server /health endpoint to verify real connectivity
 */
export async function checkServerConnectivity(): Promise<boolean> {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
  const healthEndpoint = apiUrl.replace(/\/api$/, '') + '/health'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(healthEndpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const reachable = res.ok
    updateNetworkStatus({
      isServerReachable: reachable,
      lastCheckedAt: new Date(),
    })
    return reachable
  } catch {
    updateNetworkStatus({
      isServerReachable: false,
      lastCheckedAt: new Date(),
    })
    return false
  }
}

// Global browser event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateNetworkStatus({ isOnline: true })
    void checkServerConnectivity().then((reachable) => {
      if (reachable) {
        // Automatically sync pending offline operations
        void syncEngine.syncQueue().catch((err) => {
          console.error('Auto-sync upon reconnect failed:', err)
        })
      }
    })
  })

  window.addEventListener('offline', () => {
    updateNetworkStatus({ isOnline: false, isServerReachable: false })
  })

  // Listen to queue changes from syncEngine
  window.addEventListener('injera-queue-changed', () => {
    void syncEngine.getPendingCount().then((count) => {
      updateNetworkStatus({ pendingQueueCount: count })
    })
  })

  // Initial pending count retrieval
  void syncEngine.getPendingCount().then((count) => {
    updateNetworkStatus({ pendingQueueCount: count })
  })
}

/**
 * Hook to consume real-time network and server connectivity status
 */
export function useNetworkStatus(): NetworkStatus & {
  checkConnection: () => Promise<boolean>
  syncNow: () => Promise<void>
} {
  const [status, setStatus] = useState<NetworkStatus>(globalNetworkStatus)

  useEffect(() => {
    listeners.add(setStatus)
    // Run an initial check if lastCheckedAt is null
    if (!globalNetworkStatus.lastCheckedAt && globalNetworkStatus.isOnline) {
      void checkServerConnectivity()
    }

    return () => {
      listeners.delete(setStatus)
    }
  }, [])

  const syncNow = async () => {
    await syncEngine.syncQueue()
    const count = await syncEngine.getPendingCount()
    updateNetworkStatus({ pendingQueueCount: count })
  }

  return {
    ...status,
    checkConnection: checkServerConnectivity,
    syncNow,
  }
}
