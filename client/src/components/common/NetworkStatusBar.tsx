import { useState } from 'react'
import { WifiOff, AlertTriangle, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNetworkStatus } from '@/lib/network'
import { toast } from 'sonner'

export function NetworkStatusBar() {
  const { isOnline, isServerReachable, pendingQueueCount, checkConnection, syncNow } = useNetworkStatus()
  const [checking, setChecking] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Nothing to display if completely online and server is reachable
  if (isOnline && isServerReachable && pendingQueueCount === 0) {
    return null
  }

  const handleCheckConnection = async () => {
    setChecking(true)
    try {
      const ok = await checkConnection()
      if (ok) {
        toast.success('Connection restored', {
          description: 'Bakery server is reachable.',
        })
      } else {
        toast.error('Still unreachable', {
          description: 'Cannot reach the bakery server. Operating in offline mode.',
        })
      }
    } finally {
      setChecking(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await syncNow()
      toast.success('Queue synchronized', {
        description: 'Offline transactions sent to server.',
      })
    } catch (err) {
      console.error('Manual sync failed:', err)
      toast.error('Sync failed', {
        description: 'Could not sync queued transactions. Check server connection.',
      })
    } finally {
      setSyncing(false)
    }
  }

  // Determine state banner
  const isDisconnected = !isOnline || !isServerReachable

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2 border-b transition-colors text-xs flex flex-wrap items-center justify-between gap-3 ${
        isDisconnected
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-sky-500/10 border-sky-500/20 text-sky-900 dark:text-sky-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isDisconnected ? (
          <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <CloudUpload className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">
            {!isOnline
              ? 'Offline Mode:'
              : !isServerReachable
                ? 'Server Unreachable:'
                : 'Offline Ledger Active:'}
          </span>
          <span>
            {!isOnline
              ? 'Network connection severed. New transactions and records are stored safely in local browser storage.'
              : !isServerReachable
                ? 'Bakery backend server is unreachable. Transactions are queued locally.'
                : 'Connected to server.'}
          </span>
          {pendingQueueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 dark:bg-amber-500/30 px-2 py-0.5 text-[11px] font-mono font-medium">
              <AlertTriangle className="h-3 w-3" />
              {pendingQueueCount} pending {pendingQueueCount === 1 ? 'operation' : 'operations'} in queue
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pendingQueueCount > 0 && isServerReachable && (
          <Button
            size="sm"
            variant="outline"
            disabled={syncing}
            onClick={handleSyncNow}
            className="h-7 text-[11px] gap-1.5 border-border/80"
          >
            {syncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <CloudUpload className="h-3 w-3" />
            )}
            Sync Queue
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          disabled={checking}
          onClick={handleCheckConnection}
          className="h-7 text-[11px] gap-1.5 border-border/80"
        >
          {checking ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          Check Connectivity
        </Button>
      </div>
    </div>
  )
}
