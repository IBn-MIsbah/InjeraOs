import { syncApi } from './api'
import type { SyncOperationEnvelopeEntity, SyncStatus } from '@/types'

const DB_NAME = 'injera_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'offline_queue'

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-env'
  let id = window.sessionStorage.getItem('injera_device_id')
  if (!id) {
    id = window.crypto && 'randomUUID' in window.crypto ? window.crypto.randomUUID() : `dev-${Date.now()}`
    window.sessionStorage.setItem('injera_device_id', id)
  }
  return id
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' })
        store.createIndex('syncStatus', 'syncStatus', { unique: false })
        store.createIndex('clientTimestamp', 'clientTimestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export interface EnqueueOperationOptions {
  operationType: string
  payload: Record<string, unknown>
  operationalDate?: string
  schemaVersion?: number
}

export const syncEngine = {
  getDeviceId,

  async enqueue(options: EnqueueOperationOptions): Promise<SyncOperationEnvelopeEntity> {
    const db = await openDB()
    const now = new Date().toISOString()
    const idempotencyKey = `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const envelope: SyncOperationEnvelopeEntity = {
      id: window.crypto && 'randomUUID' in window.crypto ? window.crypto.randomUUID() : idempotencyKey,
      deviceId: getDeviceId(),
      idempotencyKey,
      operationType: options.operationType,
      schemaVersion: options.schemaVersion ?? 1,
      payload: options.payload,
      clientTimestamp: now,
      operationalDate: options.operationalDate ?? now.slice(0, 10),
      syncStatus: 'PENDING',
      createdAt: now,
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(envelope)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })

    // Dispatch event to inform UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('injera-queue-changed'))
    }

    // Proactively attempt synchronization if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void this.syncQueue().catch((err) => console.error('Auto-sync error:', err))
    }

    return envelope
  },

  async getAll(): Promise<SyncOperationEnvelopeEntity[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  },

  async getPendingCount(): Promise<number> {
    try {
      const all = await this.getAll()
      return all.filter((op) => op.syncStatus === 'PENDING' || op.syncStatus === 'FAILED').length
    } catch {
      return 0
    }
  },

  async updateStatus(
    idempotencyKey: string,
    status: SyncStatus,
    errorDetails?: Record<string, unknown>
  ): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(idempotencyKey)

      getReq.onsuccess = () => {
        const item = getReq.result as SyncOperationEnvelopeEntity | undefined
        if (item) {
          item.syncStatus = status
          if (status === 'PROCESSED') {
            item.serverProcessedAt = new Date().toISOString()
          }
          if (errorDetails) {
            item.errorDetails = errorDetails
          }
          store.put(item)
        }
        resolve()
      }
      getReq.onerror = () => reject(getReq.error)
    })
  },

  async syncQueue(): Promise<{
    total: number
    processed: number
    conflicts: number
    failed: number
  }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { total: 0, processed: 0, conflicts: 0, failed: 0 }
    }

    const all = await this.getAll()
    const pending = all.filter((op) => op.syncStatus === 'PENDING' || op.syncStatus === 'FAILED')

    if (pending.length === 0) {
      return { total: 0, processed: 0, conflicts: 0, failed: 0 }
    }

    // Batch up to 50 operations at a time
    const batchSlice = pending.slice(0, 50)
    const deviceId = getDeviceId()

    try {
      const batchResult = await syncApi.syncBatch({
        deviceId,
        operations: batchSlice.map((op) => ({
          id: op.id,
          deviceId: op.deviceId || deviceId,
          idempotencyKey: op.idempotencyKey,
          operationType: op.operationType,
          schemaVersion: op.schemaVersion,
          payload: op.payload,
          clientTimestamp: op.clientTimestamp,
          ...(op.operationalDate ? { operationalDate: op.operationalDate } : {}),
        })),
      })

      // Update local IndexedDB records with server response status
      for (const res of batchResult.results) {
        await this.updateStatus(
          res.idempotencyKey,
          res.status,
          res.message ? { message: res.message } : undefined
        )
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('injera-sync-completed', { detail: batchResult })
        )
        window.dispatchEvent(new CustomEvent('injera-queue-changed'))
      }

      return {
        total: batchResult.total,
        processed: batchResult.processed,
        conflicts: batchResult.conflicts,
        failed: batchResult.failed,
      }
    } catch (err: unknown) {
      console.error('Failed to sync queue with server:', err)
      return { total: batchSlice.length, processed: 0, conflicts: 0, failed: batchSlice.length }
    }
  },

  async clearProcessed(): Promise<void> {
    const db = await openDB()
    const all = await this.getAll()
    const processed = all.filter((op) => op.syncStatus === 'PROCESSED')

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const p of processed) {
        store.delete(p.idempotencyKey)
      }
      tx.oncomplete = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('injera-queue-changed'))
        }
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  },
}

// Global online event handler to synchronize automatically when connectivity resumes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void syncEngine.syncQueue().catch((err) => {
      console.error('Online auto-sync trigger failed:', err)
    })
  })
}
