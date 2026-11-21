import { useCallback, useEffect, useState } from 'react'
import {
  syncApi,
  type SyncConflictEntity,
  type SyncOperationEnvelopeEntity,
  type SyncStatus,
} from '@/lib/api'
import { syncEngine } from '@/lib/sync-engine'
import type { ResolveConflictInput } from '@/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  HardDrive,
  Laptop,
  Plus,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export function SyncManagementView() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false)

  // Data states
  const [localQueue, setLocalQueue] = useState<SyncOperationEnvelopeEntity[]>([])
  const [serverConflicts, setServerConflicts] = useState<SyncConflictEntity[]>([])
  const [deviceId] = useState(() => syncEngine.getDeviceId())

  // View modal state
  const [selectedOperation, setSelectedOperation] =
    useState<SyncOperationEnvelopeEntity | null>(null)

  // Test operation modal state
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false)
  const [testOpType, setTestOpType] = useState('ATTENDANCE_CLOCK_IN')
  const [testOpNote, setTestOpNote] = useState('Test offline sync item')

  // Conflict resolution modal state
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictEntity | null>(null)
  const [resolveStrategy, setResolveStrategy] = useState<'OVERWRITE' | 'DISCARD' | 'ADJUST' | 'REJECT'>('DISCARD')
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveAdjustedJson, setResolveAdjustedJson] = useState('{}')
  const [isResolving, setIsResolving] = useState(false)

  // 1. Load Local IndexedDB Queue
  const loadLocalQueue = useCallback(async () => {
    setIsLoadingQueue(true)
    try {
      const items = await syncEngine.getAll()
      // Sort newest first
      items.sort((a, b) => new Date(b.clientTimestamp).getTime() - new Date(a.clientTimestamp).getTime())
      setLocalQueue(items)
    } catch (err) {
      console.error('Failed to load IndexedDB queue:', err)
    } finally {
      setIsLoadingQueue(false)
    }
  }, [])

  // 2. Load Server Conflicts
  const loadConflicts = useCallback(async () => {
    if (!navigator.onLine) return
    setIsLoadingConflicts(true)
    try {
      const conflicts = await syncApi.getConflicts({ status: 'OPEN' })
      setServerConflicts(conflicts)
    } catch (err) {
      console.error('Failed to load sync conflicts:', err)
    } finally {
      setIsLoadingConflicts(false)
    }
  }, [])

  // 3. Trigger Sync Now
  const handleSyncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Cannot synchronize while offline', {
        description: 'Please reconnect to the network to upload queued operations.',
      })
      return
    }

    setIsSyncing(true)
    try {
      const res = await syncEngine.syncQueue()
      if (res.total === 0) {
        toast.info('Synchronization complete', {
          description: 'No pending offline operations to upload.',
        })
      } else {
        toast.success(`Synchronized ${res.processed} of ${res.total} operations`, {
          description:
            res.conflicts > 0
              ? `Warning: ${res.conflicts} operation(s) flagged for stock/data conflicts.`
              : 'All operations processed successfully.',
        })
      }
      await loadLocalQueue()
      await loadConflicts()
    } catch (err) {
      console.error('Manual sync failed:', err)
      toast.error('Sync failed', {
        description: 'An error occurred during synchronization with the central server.',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [loadLocalQueue, loadConflicts])

  // 4. Initial load and Connectivity listeners
  useEffect(() => {
    let isMounted = true

    void syncEngine.getAll().then((items) => {
      if (!isMounted) return
      items.sort((a, b) => new Date(b.clientTimestamp).getTime() - new Date(a.clientTimestamp).getTime())
      setLocalQueue(items)
    })

    if (navigator.onLine) {
      void syncApi.getConflicts({ status: 'OPEN' }).then((conflicts) => {
        if (!isMounted) return
        setServerConflicts(conflicts)
      })
    }

    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Internet connection restored', {
        description: 'Auto-synchronizing offline queued operations…',
      })
      void handleSyncNow()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Network disconnected', {
        description: 'Working in offline mode. New operations will queue locally.',
      })
    }

    const onQueueChanged = () => {
      void loadLocalQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('injera-queue-changed', onQueueChanged)

    return () => {
      isMounted = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('injera-queue-changed', onQueueChanged)
    }
  }, [handleSyncNow, loadLocalQueue])

  // 5. Clear Processed Queue Items
  const handleClearProcessed = async () => {
    try {
      await syncEngine.clearProcessed()
      await loadLocalQueue()
      toast.success('IndexedDB cleaned', {
        description: 'Successfully purged processed operations from local storage.',
      })
    } catch (err) {
      console.error('Failed to clear processed:', err)
      toast.error('Failed to clean queue')
    }
  }

  // 6. Enqueue a Test Operation
  const handleEnqueueTest = async () => {
    try {
      await syncEngine.enqueue({
        operationType: testOpType,
        payload: {
          testNote: testOpNote,
          simulatedAt: new Date().toISOString(),
          category: 'OFFLINE_DIAGNOSTIC',
        },
      })
      setIsCreateTestOpen(false)
      setTestOpNote('Test offline sync item')
      await loadLocalQueue()
      toast.success('Enqueued in IndexedDB', {
        description: `Operation ${testOpType} saved to offline store.`,
      })
    } catch (err) {
      console.error('Failed to enqueue test op:', err)
      toast.error('Failed to write to IndexedDB')
    }
  }

  // 7. Resolve Conflict
  const handleOpenResolve = (conflict: SyncConflictEntity) => {
    setSelectedConflict(conflict)
    setResolveStrategy('DISCARD')
    setResolveNotes('')
    setResolveAdjustedJson(JSON.stringify(conflict.submittedState, null, 2))
  }

  const handleSubmitResolution = async () => {
    if (!selectedConflict) return
    setIsResolving(true)

    try {
      let parsedAdjusted: Record<string, unknown> | undefined = undefined
      if (resolveStrategy === 'ADJUST') {
        try {
          parsedAdjusted = JSON.parse(resolveAdjustedJson) as Record<string, unknown>
        } catch {
          toast.error('Invalid JSON format for adjusted payload')
          setIsResolving(false)
          return
        }
      }

      const input: ResolveConflictInput = {
        strategy: resolveStrategy,
        resolutionNotes: resolveNotes.trim() || undefined,
        ...(parsedAdjusted ? { adjustedPayload: parsedAdjusted } : {}),
      }

      await syncApi.resolveConflict(selectedConflict.id, input)
      toast.success('Conflict resolved', {
        description: `Conflict marked as ${resolveStrategy}. Central state updated.`,
      })
      setSelectedConflict(null)
      await loadConflicts()
      await loadLocalQueue()
    } catch (err) {
      console.error('Failed to resolve conflict:', err)
      toast.error('Conflict resolution failed', {
        description: 'The server rejected the resolution update.',
      })
    } finally {
      setIsResolving(false)
    }
  }

  // Helper badge renderers
  const renderSyncBadge = (status: SyncStatus) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            PROCESSED
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="h-3 w-3 animate-spin" />
            PENDING
          </span>
        )
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            CONFLICT
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {status}
          </span>
        )
    }
  }

  const pendingCount = localQueue.filter(
    (op) => op.syncStatus === 'PENDING' || op.syncStatus === 'FAILED'
  ).length
  const processedCount = localQueue.filter((op) => op.syncStatus === 'PROCESSED').length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Offline Queue & Synchronization Engine
            </h1>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Wifi className="h-3.5 w-3.5" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                <WifiOff className="h-3.5 w-3.5" />
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Durable IndexedDB client storage, idempotent batch synchronization, and multi-device stock conflict resolution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearProcessed}
            disabled={processedCount === 0}
            className="text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            Clear Synced
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateTestOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Queue Test Op
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing…' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending in IndexedDB
            </CardTitle>
            <HardDrive className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {pendingCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Awaiting upload to authoritative server
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Processed Locally
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {processedCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Successfully confirmed by server
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Server Open Conflicts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {serverConflicts.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Requiring supervisor intervention
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Client Device Identifier
            </CardTitle>
            <Laptop className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-xs font-mono font-semibold text-foreground">
              {deviceId || 'Loading…'}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hardware/session isolation key
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Server Open Conflicts Panel (if any) */}
      <Card className="border-border border-l-4 border-l-rose-500">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Concurrent Stock & Data Conflicts ({serverConflicts.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Multi-device conflicting updates where offline sales or mutations collided with central authoritative inventory.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadConflicts}
            disabled={isLoadingConflicts || !isOnline}
            className="text-xs gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingConflicts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {serverConflicts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/70 mb-2" />
              <p className="font-medium text-foreground">Zero Open Conflicts</p>
              <p>All distributed branch and sales operations have resolved cleanly without inventory contention.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {serverConflicts.map((conflict) => (
                <div key={conflict.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                        {conflict.conflictType}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Op: {conflict.syncOperationId.slice(0, 8)}…
                      </span>
                    </div>
                    <p className="text-xs text-foreground">
                      {conflict.description ?? 'Concurrent stock deficit detected on authoritative inventory.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenResolve(conflict)}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Resolve Conflict
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Local IndexedDB Queue Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              IndexedDB Local Queue ({localQueue.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Persistent browser storage queue that survives app restarts, device reboots, and network failures.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadLocalQueue}
            disabled={isLoadingQueue}
            className="text-xs gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
            Reload Local
          </Button>
        </CardHeader>
        <CardContent>
          {localQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
              <Database className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">Local Queue is Empty</p>
              <p>Operations executed offline will accumulate here automatically until connection resumes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Operation Type</TableHead>
                    <TableHead>Idempotency Key</TableHead>
                    <TableHead>Client Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localQueue.map((item) => (
                    <TableRow key={item.idempotencyKey}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {item.operationType}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {item.idempotencyKey}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.clientTimestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {renderSyncBadge(item.syncStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOperation(item)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operation Payload Inspector Dialog */}
      <Dialog open={!!selectedOperation} onOpenChange={(open) => !open && setSelectedOperation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Operation Envelope Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Idempotency key: <span className="font-mono">{selectedOperation?.idempotencyKey}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-2.5 rounded-md">
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-semibold text-foreground">{selectedOperation.operationType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-semibold text-foreground">{selectedOperation.syncStatus}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Device ID: </span>
                  <span className="font-mono text-[10px] text-foreground">{selectedOperation.deviceId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Version: </span>
                  <span className="text-foreground">v{selectedOperation.schemaVersion}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Enqueued Payload
                </label>
                <pre className="max-h-56 overflow-auto rounded bg-muted/70 p-2.5 font-mono text-[11px] text-foreground">
                  {JSON.stringify(selectedOperation.payload, null, 2)}
                </pre>
              </div>

              {selectedOperation.errorDetails && (
                <div>
                  <label className="text-[11px] font-medium text-rose-500 block mb-1">
                    Error / Server Diagnostics
                  </label>
                  <pre className="max-h-32 overflow-auto rounded bg-rose-500/10 p-2 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                    {JSON.stringify(selectedOperation.errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedOperation(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Queue Test Operation Dialog */}
      <Dialog open={isCreateTestOpen} onOpenChange={setIsCreateTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Queue Diagnostic Operation</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Simulate an offline user action to verify IndexedDB persistence and auto-synchronization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Operation Type
              </label>
              <select
                value={testOpType}
                onChange={(e) => setTestOpType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ATTENDANCE_CLOCK_IN">ATTENDANCE_CLOCK_IN</option>
                <option value="ATTENDANCE_CLOCK_OUT">ATTENDANCE_CLOCK_OUT</option>
                <option value="EXPENSE_RECORD">EXPENSE_RECORD</option>
                <option value="PURCHASE_CREATE">PURCHASE_CREATE</option>
                <option value="SALES_ORDER_CREATE">SALES_ORDER_CREATE</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Diagnostic Description / Payload Note
              </label>
              <Input
                value={testOpNote}
                onChange={(e) => setTestOpNote(e.target.value)}
                placeholder="e.g. Test morning offline bake shift"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateTestOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleEnqueueTest}>
              Save to IndexedDB
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={(open) => !open && setSelectedConflict(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Resolve Multi-Device Conflict
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select resolution strategy for conflict on operation{' '}
              <span className="font-mono">{selectedConflict?.syncOperationId.slice(0, 10)}…</span>
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="font-semibold block mb-1 text-foreground">Authoritative Server State</span>
                  <pre className="max-h-36 overflow-auto rounded bg-muted/60 p-2 font-mono text-[10px] text-muted-foreground">
                    {JSON.stringify(selectedConflict.serverState, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="font-semibold block mb-1 text-foreground">Submitted Client State</span>
                  <pre className="max-h-36 overflow-auto rounded bg-muted/60 p-2 font-mono text-[10px] text-muted-foreground">
                    {JSON.stringify(selectedConflict.submittedState, null, 2)}
                  </pre>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1.5">
                  Resolution Strategy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolveStrategy('DISCARD')}
                    className={`rounded border p-2 text-left text-xs transition-colors ${
                      resolveStrategy === 'DISCARD'
                        ? 'border-rose-500 bg-rose-500/10 font-semibold text-rose-700 dark:text-rose-300'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-bold">DISCARD / REJECT</div>
                    <div className="text-[10px] text-muted-foreground">Keep server authoritative stock</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolveStrategy('OVERWRITE')}
                    className={`rounded border p-2 text-left text-xs transition-colors ${
                      resolveStrategy === 'OVERWRITE'
                        ? 'border-amber-500 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-bold">OVERWRITE</div>
                    <div className="text-[10px] text-muted-foreground">Force offline change to server</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolveStrategy('ADJUST')}
                    className={`rounded border p-2 text-left text-xs transition-colors ${
                      resolveStrategy === 'ADJUST'
                        ? 'border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-bold">ADJUST</div>
                    <div className="text-[10px] text-muted-foreground">Supply tailored quantities</div>
                  </button>
                </div>
              </div>

              {resolveStrategy === 'ADJUST' && (
                <div>
                  <label className="text-[11px] font-medium text-foreground block mb-1">
                    Adjusted Payload (JSON)
                  </label>
                  <Textarea
                    value={resolveAdjustedJson}
                    onChange={(e) => setResolveAdjustedJson(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">
                  Supervisor Resolution Notes
                </label>
                <Input
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Partial shipment accepted; inventory reconciled."
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedConflict(null)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmitResolution}
              disabled={isResolving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isResolving ? 'Resolving…' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
