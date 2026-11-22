import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  History,
  HardDrive,
  Info,
  Lock,
  RefreshCw,
  Sliders,
  Terminal,
  Wifi,
  XCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import { systemApi, auditApi } from '@/lib/api'
import type {
  SystemStatusResult,
  SystemSettingsEntity,
  UpdateSystemSettingsInput,
  AuditLogEntity,
} from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

function Badge({
  children,
  className = '',
  variant = 'default',
}: {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
}) {
  const base = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium'
  const variants = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-border text-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
  }
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>
}

function Label({
  children,
  htmlFor,
  className = '',
}: {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={`text-xs font-semibold text-foreground ${className}`}>
      {children}
    </label>
  )
}

export function SystemSettingsView({ initialTab = 'status' }: { initialTab?: 'status' | 'tweaks' | 'audit' }) {
  const [activeTab, setActiveTab] = useState<'status' | 'tweaks' | 'audit'>(initialTab)

  // Status state
  const [status, setStatus] = useState<SystemStatusResult | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  // Settings / Tweaks state
  const [settings, setSettings] = useState<SystemSettingsEntity | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [tweaksForm, setTweaksForm] = useState<UpdateSystemSettingsInput>({
    employeeNumberPrefix: 'EMP',
    minQualityYieldPercent: 85,
    tokenSessionDurationMinutes: 480,
    maintenanceMode: false,
    autoSyncIntervalSeconds: 30,
    enforceShiftClockInGraceMinutes: 15,
    allowOfflineTransactions: true,
  })

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditLimit] = useState(15)
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [searchAction, setSearchAction] = useState('')
  const [filterSource, setFilterSource] = useState<string>('ALL')
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntity | null>(null)

  // Fetch status
  const loadStatus = async () => {
    try {
      setRefreshingStatus(true)
      const data = await systemApi.getStatus()
      setStatus(data)
    } catch (err) {
      console.error('Failed to load system status:', err)
      toast.error('Unable to retrieve realtime system diagnostic telemetry')
    } finally {
      setLoadingStatus(false)
      setRefreshingStatus(false)
    }
  }

  // Fetch settings
  const loadSettings = async () => {
    try {
      setLoadingSettings(true)
      const data = await systemApi.getSettings()
      setSettings(data)
      setTweaksForm({
        employeeNumberPrefix: data.employeeNumberPrefix,
        minQualityYieldPercent: data.minQualityYieldPercent,
        tokenSessionDurationMinutes: data.tokenSessionDurationMinutes,
        maintenanceMode: data.maintenanceMode,
        autoSyncIntervalSeconds: data.autoSyncIntervalSeconds,
        enforceShiftClockInGraceMinutes: data.enforceShiftClockInGraceMinutes,
        allowOfflineTransactions: data.allowOfflineTransactions,
      })
    } catch (err) {
      console.error('Failed to load system settings:', err)
      toast.error('Unable to fetch system operational parameters')
    } finally {
      setLoadingSettings(false)
    }
  }

  // Fetch audit logs
  const loadAuditLogs = async (page = 1) => {
    try {
      setLoadingAudit(true)
      const res = await auditApi.getLogs({
        page,
        limit: auditLimit,
        action: searchAction || undefined,
        source: filterSource !== 'ALL' ? filterSource : undefined,
      })
      setAuditLogs(res.data)
      setAuditTotal(res.pagination.total)
      setAuditPage(page)
    } catch (err) {
      console.error('Failed to load audit trail:', err)
      toast.error('Unable to query audit logs')
    } finally {
      setLoadingAudit(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const [statusData, settingsData, auditRes] = await Promise.all([
          systemApi.getStatus(),
          systemApi.getSettings(),
          auditApi.getLogs({ page: 1, limit: auditLimit }),
        ])
        if (mounted) {
          setStatus(statusData)
          setSettings(settingsData)
          setTweaksForm({
            employeeNumberPrefix: settingsData.employeeNumberPrefix,
            minQualityYieldPercent: settingsData.minQualityYieldPercent,
            tokenSessionDurationMinutes: settingsData.tokenSessionDurationMinutes,
            maintenanceMode: settingsData.maintenanceMode,
            autoSyncIntervalSeconds: settingsData.autoSyncIntervalSeconds,
            enforceShiftClockInGraceMinutes: settingsData.enforceShiftClockInGraceMinutes,
            allowOfflineTransactions: settingsData.allowOfflineTransactions,
          })
          setAuditLogs(auditRes.data)
          setAuditTotal(auditRes.pagination.total)
          setAuditPage(1)
        }
      } catch (err) {
        console.error('Initialization error:', err)
      } finally {
        if (mounted) {
          setLoadingStatus(false)
          setLoadingSettings(false)
          setLoadingAudit(false)
        }
      }
    }
    void init()
    return () => {
      mounted = false
    }
  }, [auditLimit])

  const handleSaveTweaks = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      const res = await systemApi.updateSettings(tweaksForm)
      setSettings(res.data)
      toast.success(res.message || 'System operational tweaks applied successfully')
      // Refresh status and audit logs to display updated telemetry & new audit entry
      void loadStatus()
      void loadAuditLogs(1)
    } catch (err: unknown) {
      console.error('Failed to update system settings:', err)
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to update system parameters'
      toast.error(msg)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              System Settings, Status & Audit
            </h1>
            <Badge
              variant="outline"
              className="bg-forest/10 text-forest border-forest/30 dark:bg-oat/15 dark:text-oat text-[11px] font-semibold uppercase"
            >
              ADMIN & SUPERADMIN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise administration console: Realtime database & memory telemetry, operational parameters, and immutable audit trailing.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'status' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('status')}
            className={`text-xs gap-1.5 cursor-pointer rounded-lg h-8 ${
              activeTab === 'status'
                ? 'bg-forest text-oat shadow-xs hover:bg-forest/90 dark:bg-oat dark:text-forest'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>System Status</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === 'tweaks' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('tweaks')}
            className={`text-xs gap-1.5 cursor-pointer rounded-lg h-8 ${
              activeTab === 'tweaks'
                ? 'bg-forest text-oat shadow-xs hover:bg-forest/90 dark:bg-oat dark:text-forest'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>System Tweaks</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === 'audit' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('audit')}
            className={`text-xs gap-1.5 cursor-pointer rounded-lg h-8 ${
              activeTab === 'audit'
                ? 'bg-forest text-oat shadow-xs hover:bg-forest/90 dark:bg-oat dark:text-forest'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Trail</span>
          </Button>
        </div>
      </div>

      {/* Maintenance Mode Warning if active */}
      {settings?.maintenanceMode && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 text-xs">
            <span className="font-bold">System is currently in MAINTENANCE MODE:</span> Non-admin operations will display scheduled maintenance notices. You can disable this anytime under System Tweaks.
          </div>
        </div>
      )}

      {/* TAB 1: SYSTEM HEALTH & TELEMETRY */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Overall Engine Health:</span>
              {status?.health === 'HEALTHY' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  HEALTHY
                </Badge>
              )}
              {status?.health === 'MAINTENANCE' && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  MAINTENANCE
                </Badge>
              )}
              {status?.health === 'DEGRADED' && (
                <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-semibold">
                  <XCircle className="h-3 w-3" />
                  DEGRADED
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadStatus}
              disabled={refreshingStatus || loadingStatus}
              className="gap-1.5 text-xs h-8 border-border/80 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </Button>
          </div>

          {loadingStatus ? (
            <div className="grid grid-cols-12 gap-5">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="col-span-12 md:col-span-6 lg:col-span-4 animate-pulse bg-muted/30 h-40 border-border/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-5">
              {/* PostgreSQL Engine */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4 text-forest dark:text-oat" />
                      PostgreSQL Relational DB
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                      {status?.database.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Database pool & connection latency</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Ping Latency</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                      {status?.database.latencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Engine</span>
                    <span className="font-mono text-foreground text-[11px]">{status?.database.provider}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Pool Status</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{status?.database.poolStatus}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Memory Footprint */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-forest dark:text-oat" />
                      Node.js Memory Footprint
                    </CardTitle>
                    <span className="text-xs font-mono tabular-nums font-semibold text-muted-foreground">
                      {status?.memory.usagePercent}%
                    </span>
                  </div>
                  <CardDescription className="text-xs">Heap & resident set allocation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Heap Used / Total</span>
                    <span className="text-base font-bold font-mono tabular-nums text-foreground">
                      {status?.memory.heapUsedMb} <span className="text-xs font-normal text-muted-foreground">/ {status?.memory.heapTotalMb} MB</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest dark:bg-oat transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, status?.memory.usagePercent || 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Resident Set (RSS)</span>
                    <span className="font-mono tabular-nums text-foreground">{status?.memory.rssMb} MB</span>
                  </div>
                </CardContent>
              </Card>

              {/* Process Uptime & Runtime */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-forest dark:text-oat" />
                      Platform Runtime
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {status?.runtime.nodeVersion}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Server process lifecycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Uptime</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                      {status?.runtime.uptimeFormatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Platform</span>
                    <span className="capitalize text-foreground">{status?.runtime.platform} ({status?.runtime.architecture})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Environment</span>
                    <span className="uppercase font-mono text-foreground text-[11px]">{status?.runtime.environment}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Offline Sync Engine */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-forest dark:text-oat" />
                      Offline Sync Engine
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        status?.syncEngine.pendingOperations === 0
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {status?.syncEngine.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">IndexedDB queue & conflict processor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Pending Queue</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                      {status?.syncEngine.pendingOperations} <span className="text-xs font-normal text-muted-foreground">ops</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Unresolved Conflicts</span>
                    <span className={`font-bold ${status?.syncEngine.openConflicts ? 'text-amber-600' : 'text-foreground'}`}>
                      {status?.syncEngine.openConflicts}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Auto-Sync Cadence</span>
                    <span className="font-mono text-foreground">Every {status?.syncEngine.autoSyncIntervalSeconds}s</span>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Sessions */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-forest dark:text-oat" />
                      Session & Device Security
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                      ACTIVE
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Authentication token lifecycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Active Sessions</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                      {status?.security.activeUserSessions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Registered Devices</span>
                    <span className="font-medium text-foreground">{status?.security.registeredDevices}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cookie Policy</span>
                    <span className="text-[11px] font-mono text-foreground">{status?.security.cookieMode}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Tenant */}
              <Card className="col-span-12 md:col-span-6 lg:col-span-4 border-border/80 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-forest dark:text-oat" />
                      Tenant Information
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat font-bold">
                      {status?.business.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Tenant workspace identity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Business Name</span>
                    <span className="text-base font-bold text-foreground truncate max-w-[170px]">
                      {status?.business.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Business ID</span>
                    <span className="font-mono text-[10px] text-foreground truncate max-w-[160px]">
                      {status?.business.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Telemetry Checked</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {status ? new Date(status.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SYSTEM OPERATIONAL TWEAKS */}
      {activeTab === 'tweaks' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-forest dark:text-oat" />
                  Tune System Operational Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Adjust thresholds, auto-assignment schemes, and background sync settings. Modifying these records an entry in the system audit trail.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadSettings}
                disabled={loadingSettings}
                className="gap-1.5 text-xs h-8 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSettings ? 'animate-spin' : ''}`} />
                <span>Reload Settings</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="space-y-4 py-8 animate-pulse text-center text-xs text-muted-foreground">
                Loading system operational configurations...
              </div>
            ) : (
              <form onSubmit={handleSaveTweaks} className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Employee Number Prefix */}
                  <div className="col-span-12 md:col-span-6 space-y-2">
                    <Label htmlFor="employeeNumberPrefix" className="text-xs font-semibold">
                      Employee ID Auto-Assignment Prefix
                    </Label>
                    <Input
                      id="employeeNumberPrefix"
                      value={tweaksForm.employeeNumberPrefix || ''}
                      onChange={(e) =>
                        setTweaksForm({ ...tweaksForm, employeeNumberPrefix: e.target.value.toUpperCase() })
                      }
                      maxLength={8}
                      placeholder="e.g. EMP or KD"
                      className="font-mono tabular-nums text-xs uppercase"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used when registering new employees automatically: e.g. <span className="font-mono font-semibold">{tweaksForm.employeeNumberPrefix || 'EMP'}-0001</span>.
                    </p>
                  </div>

                  {/* Minimum Quality Yield % */}
                  <div className="col-span-12 md:col-span-6 space-y-2">
                    <Label htmlFor="minQualityYieldPercent" className="text-xs font-semibold">
                      Minimum Baking Quality Yield Threshold (%)
                    </Label>
                    <Input
                      id="minQualityYieldPercent"
                      type="number"
                      min={50}
                      max={100}
                      value={tweaksForm.minQualityYieldPercent || 85}
                      onChange={(e) =>
                        setTweaksForm({ ...tweaksForm, minQualityYieldPercent: Number(e.target.value) })
                      }
                      className="font-mono tabular-nums text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Mitad production batches with yield below this threshold trigger manager defect reviews.
                    </p>
                  </div>

                  {/* Token Session Duration */}
                  <div className="col-span-12 md:col-span-6 space-y-2">
                    <Label htmlFor="tokenSessionDurationMinutes" className="text-xs font-semibold">
                      User Token Session Lifespan (Minutes)
                    </Label>
                    <Input
                      id="tokenSessionDurationMinutes"
                      type="number"
                      min={30}
                      max={10080}
                      value={tweaksForm.tokenSessionDurationMinutes || 480}
                      onChange={(e) =>
                        setTweaksForm({ ...tweaksForm, tokenSessionDurationMinutes: Number(e.target.value) })
                      }
                      className="font-mono tabular-nums text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Standard work shift: 480 min (8h), extended: 720 min (12h).
                    </p>
                  </div>

                  {/* Auto-Sync Interval */}
                  <div className="col-span-12 md:col-span-6 space-y-2">
                    <Label htmlFor="autoSyncIntervalSeconds" className="text-xs font-semibold">
                      Background Auto-Sync Interval (Seconds)
                    </Label>
                    <Input
                      id="autoSyncIntervalSeconds"
                      type="number"
                      min={10}
                      max={600}
                      value={tweaksForm.autoSyncIntervalSeconds || 30}
                      onChange={(e) =>
                        setTweaksForm({ ...tweaksForm, autoSyncIntervalSeconds: Number(e.target.value) })
                      }
                      className="font-mono tabular-nums text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Frequency at which offline POS & attendance actions flush to the server.
                    </p>
                  </div>

                  {/* Shift Grace Period */}
                  <div className="col-span-12 md:col-span-6 space-y-2">
                    <Label htmlFor="enforceShiftClockInGraceMinutes" className="text-xs font-semibold">
                      Clock-In Attendance Grace Period (Minutes)
                    </Label>
                    <Input
                      id="enforceShiftClockInGraceMinutes"
                      type="number"
                      min={0}
                      max={60}
                      value={tweaksForm.enforceShiftClockInGraceMinutes || 15}
                      onChange={(e) =>
                        setTweaksForm({
                          ...tweaksForm,
                          enforceShiftClockInGraceMinutes: Number(e.target.value),
                        })
                      }
                      className="font-mono tabular-nums text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Minutes past shift start before an employee clock-in is flagged as LATE.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-5 space-y-4">
                  {/* Maintenance Mode Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        System Maintenance Mode
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Restricts general access and displays a maintenance banner to all non-admin users.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(tweaksForm.maintenanceMode)}
                      onCheckedChange={(checked) =>
                        setTweaksForm({ ...tweaksForm, maintenanceMode: checked })
                      }
                    />
                  </div>

                  {/* Offline Transactions Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <Wifi className="h-3.5 w-3.5 text-forest dark:text-oat" />
                        Allow Offline Transactions
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Permit cashiers and bakers to queue sales and batch logs while disconnected.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(tweaksForm.allowOfflineTransactions)}
                      onCheckedChange={(checked) =>
                        setTweaksForm({ ...tweaksForm, allowOfflineTransactions: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-forest text-oat hover:bg-forest/90 dark:bg-oat dark:text-forest text-xs font-semibold cursor-pointer shadow-xs gap-2"
                  >
                    {savingSettings && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save & Apply Tweaks</span>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: AUDIT TRAIL EXPLORER */}
      {activeTab === 'audit' && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-forest dark:text-oat" />
                  System Audit Trail & Compliance Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable record of system configuration changes, offline synchronizations, and security events.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAuditLogs(auditPage)}
                disabled={loadingAudit}
                className="gap-1.5 text-xs h-8 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Filter by action (e.g. UPDATE_SYSTEM_SETTINGS, ATTENDANCE)..."
                  value={searchAction}
                  onChange={(e) => setSearchAction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadAuditLogs(1)
                  }}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value)
                  }}
                  className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-hidden"
                >
                  <option value="ALL">All Sources</option>
                  <option value="WEB">WEB</option>
                  <option value="MOBILE">MOBILE</option>
                  <option value="OFFLINE_SYNC">OFFLINE_SYNC</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadAuditLogs(1)}
                  className="text-xs h-9 cursor-pointer"
                >
                  Apply Filter
                </Button>
              </div>
            </div>

            {/* Audit Logs Table */}
            {loadingAudit ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                Querying audit events from database...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed rounded-xl">
                <Info className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div className="text-xs font-semibold">No audit entries found</div>
                <p className="text-[11px] text-muted-foreground">
                  Try adjusting your search criteria or make a system parameter tweak to generate logs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b text-[11px] text-muted-foreground font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Entity Type</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {new Date(log.occurredAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] font-semibold bg-forest/10 text-forest border-forest/20 dark:bg-oat/15 dark:text-oat"
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-medium text-foreground">{log.actor?.name || 'Automated'}</div>
                          {log.actor?.email && (
                            <div className="text-[10px] text-muted-foreground">{log.actor.email}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-foreground">
                          {log.entityType}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                            {log.source}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAuditLog(log)}
                            className="h-7 px-2 text-xs gap-1 cursor-pointer text-forest dark:text-oat"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Details</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {auditTotal > auditLimit && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                <span>
                  Showing {Math.min(auditTotal, (auditPage - 1) * auditLimit + 1)} -{' '}
                  {Math.min(auditTotal, auditPage * auditLimit)} of {auditTotal} logs
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage <= 1}
                    onClick={() => loadAuditLogs(auditPage - 1)}
                    className="h-7 text-xs cursor-pointer"
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-[11px]">Page {auditPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage * auditLimit >= auditTotal}
                    onClick={() => loadAuditLogs(auditPage + 1)}
                    className="h-7 text-xs cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Detail Modal */}
      <Dialog open={Boolean(selectedAuditLog)} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-forest dark:text-oat" />
              Audit Entry Inspection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Action: <span className="font-mono font-semibold text-foreground">{selectedAuditLog?.action}</span> &bull; Entity: <span className="font-mono text-foreground">{selectedAuditLog?.entityType}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedAuditLog && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Actor</span>
                  <span className="font-medium text-foreground">{selectedAuditLog.actor?.name || 'System Engine'}</span>
                  <div className="text-muted-foreground text-[10px]">{selectedAuditLog.actor?.email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Occurred At</span>
                  <span className="font-mono text-foreground">{new Date(selectedAuditLog.occurredAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Entity ID</span>
                  <span className="font-mono text-[11px] text-foreground truncate block">{selectedAuditLog.entityId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Source Channel</span>
                  <Badge variant="outline" className="font-mono text-[10px] mt-0.5">{selectedAuditLog.source}</Badge>
                </div>
              </div>

              {selectedAuditLog.reason && (
                <div className="p-3 rounded-lg border bg-background">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Reason / Notes</span>
                  <p className="text-foreground">{selectedAuditLog.reason}</p>
                </div>
              )}

              {selectedAuditLog.beforeData && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">State Before Change</span>
                  <pre className="p-3 rounded-lg bg-muted/60 border text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedAuditLog.beforeData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAuditLog.afterData && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">State After Change</span>
                  <pre className="p-3 rounded-lg bg-muted/60 border text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedAuditLog.afterData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
