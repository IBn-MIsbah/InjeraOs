import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  authApi,
  rolesApi,
  reportsApi,
  dashboardsApi,
  type ActiveSession,
  type AuthContextResponse,
  type PermissionEntity,
  type RoleEntity,
  type DashboardSummaryResult,
  type DashboardLayoutEntity,
  type DashboardWidgetEntity,
} from '@/lib/api'
import { ROLE_OPTIONS } from '@/types/enums'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Award,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChefHat,
  Clock,
  Coins,
  DollarSign,
  Eye,
  EyeOff,
  Flame,
  Key,
  Laptop,
  Layout,
  Loader2,
  LogOut,
  RefreshCw,
  Settings2,
  Shield,
  Smartphone,
  Trash2,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'

interface DemoDashboardProps {
  auth: AuthContextResponse
  onLogout: () => void
  onNavigateTab?: (tab: string) => void
}

const DEFAULT_WIDGETS = [
  { widgetType: 'revenue_pulse', title: 'Revenue & Accruals', positionX: 0, positionY: 0, width: 6, height: 4, configuration: {} },
  { widgetType: 'production_gauge', title: 'Mitad Baking Operations', positionX: 6, positionY: 0, width: 6, height: 4, configuration: {} },
  { widgetType: 'teff_variety_mix', title: 'Grain & Teff Distribution', positionX: 0, positionY: 4, width: 6, height: 4, configuration: {} },
  { widgetType: 'baker_productivity', title: 'Baker Yield Rankings', positionX: 6, positionY: 4, width: 6, height: 4, configuration: {} },
  { widgetType: 'session_monitor', title: 'Security & Active Sessions', positionX: 0, positionY: 8, width: 12, height: 6, configuration: {} },
]

export function DemoDashboard({ auth, onLogout, onNavigateTab }: DemoDashboardProps) {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [rotationStatus, setRotationStatus] = useState<string | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [roles, setRoles] = useState<RoleEntity[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [selectedRoleName, setSelectedRoleName] = useState<string>('OWNER')

  // Live Summary Metrics
  const [summary, setSummary] = useState<DashboardSummaryResult | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Customizable Dashboard Layouts
  const [, setLayouts] = useState<DashboardLayoutEntity[]>([])
  const [activeLayout, setActiveLayout] = useState<DashboardLayoutEntity | null>(null)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)

  // Online detection
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadSessions = useCallback(async (showToast = false) => {
    setLoadingSessions(true)
    try {
      const data = await authApi.getSessions()
      setSessions(data)
      if (showToast) {
        toast.info('Sessions refreshed', {
          description: `${data.length} active session(s) tracked.`,
        })
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err)
      toast.error('Failed to load sessions', {
        description: 'Could not fetch active device sessions.',
      })
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    void authApi
      .getSessions()
      .then((data) => {
        if (!ignore) setSessions(data)
      })
      .catch((err) => console.error('Failed to load active sessions:', err))

    void rolesApi
      .getRoles()
      .then((data) => {
        if (!ignore) {
          setRoles(data)
          if (data.length > 0) {
            setSelectedRoleName(auth.role ?? data[0].name)
          }
        }
      })
      .catch((err) => console.error('Failed to load roles:', err))
      .finally(() => {
        if (!ignore) setLoadingRoles(false)
      })

    void dashboardsApi
      .getLayouts()
      .then(async (list) => {
        if (ignore) return
        if (list.length > 0) {
          setLayouts(list)
          const defaultOne = list.find((l) => l.isDefault) ?? list[0]
          setActiveLayout(defaultOne)
        } else {
          try {
            const created = await dashboardsApi.createLayout({
              name: 'Executive Overview',
              isDefault: true,
              widgets: DEFAULT_WIDGETS,
            })
            if (!ignore) {
              setLayouts([created])
              setActiveLayout(created)
            }
          } catch (err) {
            console.error('Failed to create default layout:', err)
          }
        }
      })
      .catch((err) => {
        if (!ignore) console.error('Failed to load layouts:', err)
      })

    void reportsApi
      .getDashboardSummary()
      .then((data) => {
        if (!ignore) {
          setSummary(data)
          setLoadingSummary(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load dashboard summary:', err)
          setLoadingSummary(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [auth.role])

  const handleTestRotation = async () => {
    setIsRotating(true)
    setRotationStatus(null)
    try {
      await authApi.refresh()
      const message = 'Rotated refresh token and renewed access cookie successfully.'
      setRotationStatus(message)
      toast.success('Session renewed', {
        description: 'Access and refresh cookies were rotated cleanly.',
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Session rotation failed. Token may be expired.'
      setRotationStatus(message)
      toast.error('Rotation failed', {
        description: message,
      })
    } finally {
      setIsRotating(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await authApi.revokeSession(sessionId)
      if (sessionId === auth.sessionId) {
        toast.info('Current session revoked', {
          description: 'You have been signed out from this device.',
        })
        onLogout()
        return
      }
      toast.success('Device revoked', {
        description: 'Session terminated successfully.',
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Could not revoke session.'
      toast.error('Failed to revoke session', {
        description: message,
      })
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeOthers = async () => {
    setLoadingSessions(true)
    try {
      const res = await authApi.revokeOtherSessions()
      toast.success('Other sessions revoked', {
        description: `Successfully revoked ${res.revokedCount} other active device(s).`,
      })
      await loadSessions()
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        'Failed to revoke other sessions.'
      toast.error('Action failed', {
        description: message,
      })
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleToggleWidget = async (type: string, title: string) => {
    if (!activeLayout) return
    const currentWidgets: DashboardWidgetEntity[] = activeLayout.widgets || []
    const exists = currentWidgets.find((w) => w.widgetType === type)

    let updatedWidgets: DashboardWidgetEntity[]
    if (exists) {
      updatedWidgets = currentWidgets.filter((w) => w.widgetType !== type)
    } else {
      updatedWidgets = [
        ...currentWidgets,
        {
          id: `w-${type}-${currentWidgets.length}`,
          dashboardLayoutId: activeLayout.id,
          widgetType: type,
          title,
          positionX: 0,
          positionY: currentWidgets.length * 4,
          width: 6,
          height: 4,
          configuration: {},
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setSavingLayout(true)
    try {
      const saved = await dashboardsApi.updateLayout(activeLayout.id, {
        widgets: updatedWidgets.map((w, idx) => ({
          widgetType: w.widgetType,
          title: w.title,
          positionX: w.positionX,
          positionY: idx * 4,
          width: w.width,
          height: w.height,
          configuration: w.configuration ?? {},
        })),
      })
      setActiveLayout(saved)
      toast.success('Dashboard layout updated')
    } catch (err) {
      console.error('Failed to update layout:', err)
      toast.error('Could not save dashboard layout')
    } finally {
      setSavingLayout(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return isoString
    }
  }

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val ?? 0)
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(num)
  }

  const isWidgetVisible = (type: string) => {
    return activeLayout?.widgets ? activeLayout.widgets.some((w) => w.widgetType === type) : true
  }

  // Simulated 7-day revenue trend data for the visual graph
  const revenueTrendDays = [
    { day: 'Mon', revenue: 14200, height: 42 },
    { day: 'Tue', revenue: 18500, height: 55 },
    { day: 'Wed', revenue: 22100, height: 68 },
    { day: 'Thu', revenue: 19800, height: 60 },
    { day: 'Fri', revenue: 28400, height: 86 },
    { day: 'Sat', revenue: 34200, height: 100 },
    { day: 'Sun (Today)', revenue: summary?.today.revenue || 24600, height: 75 },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Executive Header & Status Card */}
      <div className="rounded-2xl border border-forest/20 bg-gradient-to-br from-card via-card to-oat/30 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-forest text-oat px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                KD PLC InjeraOS
              </span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                  <Wifi className="h-3 w-3" />
                  Live Sync
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-xs font-medium animate-pulse">
                  <WifiOff className="h-3 w-3" />
                  Offline Mode Active
                </span>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                {auth.business?.name ?? 'KD Commercial Baking Enterprise'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-forest dark:text-oat">
              Good day, {auth.user.name}
            </h1>

            <p className="text-xs text-muted-foreground">
              Role: <strong className="text-foreground">{auth.role ?? 'OWNER'}</strong> &bull;
              Account: <span className="font-medium text-foreground">{auth.user.email}</span> &bull;
              Business ID: <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">{auth.businessId.slice(0, 8)}…</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="border-border text-xs gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{isCustomizing ? 'Done Customizing' : 'Customize Layout'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRotation}
              disabled={isRotating}
              className="border-border text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin' : ''}`} />
              <span>Verify Auth</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="text-xs gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Quick Operational Navigation Tray */}
        <div className="mt-5 pt-4 border-t border-border/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Quick Actions:
          </span>
          {onNavigateTab && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('production')}
                className="h-7 text-xs gap-1 border-forest/20 hover:bg-forest/5"
              >
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                <span>Start Baking Session</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('sales')}
                className="h-7 text-xs gap-1 border-forest/20 hover:bg-forest/5"
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span>Record Sale</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('materials')}
                className="h-7 text-xs gap-1 border-forest/20 hover:bg-forest/5"
              >
                <Boxes className="h-3.5 w-3.5 text-sky-600" />
                <span>Receive Teff Lot</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('expenses')}
                className="h-7 text-xs gap-1 border-forest/20 hover:bg-forest/5"
              >
                <Coins className="h-3.5 w-3.5 text-rose-500" />
                <span>Log Expense</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('sync')}
                className="h-7 text-xs gap-1 border-forest/20 hover:bg-forest/5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>Offline Queue</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rotation Notification */}
      {rotationStatus && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{rotationStatus}</span>
        </div>
      )}

      {/* Customize Widget Tray (When customizing) */}
      {isCustomizing && (
        <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layout className="h-4 w-4 text-forest dark:text-oat" />
              Toggle Dashboard Widgets
            </span>
            <span className="text-[11px] text-muted-foreground">
              Layout saved automatically to your profile
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'revenue_pulse', label: 'Revenue Pulse' },
              { type: 'production_gauge', label: 'Baking Operations' },
              { type: 'teff_variety_mix', label: 'Grain & Teff Mix' },
              { type: 'baker_productivity', label: 'Baker Rankings' },
              { type: 'session_monitor', label: 'Security & Sessions' },
            ].map((w) => {
              const visible = isWidgetVisible(w.type)
              return (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => handleToggleWidget(w.type, w.label)}
                  disabled={savingLayout}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    visible
                      ? 'bg-forest text-oat shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span>{w.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Status & KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Revenue */}
        <Card className="border-border/80 shadow-xs hover:border-forest/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Today's Accrual Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {loadingSummary ? '…' : formatCurrency(summary?.today.revenue)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{summary?.today.orderCount ?? 0} orders recorded</span>
              <span className="text-emerald-600 font-semibold">+14.2%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Current Month Volume & OPEX */}
        <Card className="border-border/80 shadow-xs hover:border-forest/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Monthly Invoiced Volume
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest dark:bg-oat/15 dark:text-oat">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-forest dark:text-oat font-mono">
              {loadingSummary ? '…' : formatCurrency(summary?.currentMonth.revenue)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>OPEX: {formatCurrency(summary?.currentMonth.operatingExpenses)}</span>
              <span>{summary?.currentMonth.orderCount ?? 0} deliveries</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Baking Sessions */}
        <Card className="border-border/80 shadow-xs hover:border-forest/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Mitad Baking
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Flame className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {loadingSummary ? '…' : `${summary?.operations.activeBatchesCount ?? 0} Batches`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Clay & Electric Mitads active</span>
              <span className="text-amber-600 font-medium">Baking now</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Accounts Receivable */}
        <Card className="border-border/80 shadow-xs hover:border-forest/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Accounts Receivable
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {loadingSummary ? '…' : formatCurrency(summary?.operations.totalReceivables)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{summary?.operations.activeCustomersCount ?? 0} active credit accounts</span>
              <span className="text-violet-600 font-medium">Aging monitored</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Statistics & Graphs Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 7-Day Revenue & Demand Trend (SVG Area/Bar Visualizer) */}
        {isWidgetVisible('revenue_pulse') && (
          <Card className="lg:col-span-7 border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-4 w-4 text-forest dark:text-oat" />
                  7-Day Commercial Demand & Revenue Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily revenue trajectory across restaurant standing orders and retail POS sales.
                </CardDescription>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                +18.4% Week-on-Week
              </span>
            </CardHeader>
            <CardContent>
              {/* Visual Graph Bars */}
              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border/80">
                {revenueTrendDays.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {(item.revenue / 1000).toFixed(1)}k
                    </span>
                    <div
                      style={{ height: `${item.height}%` }}
                      className={`w-full max-w-[36px] rounded-t-md transition-all ${
                        idx === 6
                          ? 'bg-forest dark:bg-oat shadow-sm'
                          : 'bg-forest/60 hover:bg-forest/80 dark:bg-oat/50 dark:hover:bg-oat/80'
                      }`}
                    />
                    <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-forest dark:bg-oat" />
                  <span>Completed Sales Ledger (ETB)</span>
                </div>
                <span>Peak production day: Saturday (34,200 ETB)</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mitad Yield & Defect Breakdown Progress Gauge */}
        {isWidgetVisible('production_gauge') && (
          <Card className="lg:col-span-5 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <ChefHat className="h-4 w-4 text-amber-500" />
                Mitad Quality & Rejection Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time output absorption: 94.6% Accepted Sellable Injera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">Accepted Sellable Units</span>
                  <span className="font-bold text-forest dark:text-oat">94.6% (14,280 pcs)</span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-forest dark:bg-oat rounded-full" style={{ width: '94.6%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Burnt Defect (ከልክ በላይ የበሰለ)</span>
                  <span className="font-medium text-rose-600">2.8% (420 pcs)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '2.8%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Torn & Broken (የተቀደደ)</span>
                  <span className="font-medium text-amber-600">1.6% (240 pcs)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '1.6%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Irregular Thickness / Size</span>
                  <span className="font-medium text-muted-foreground">1.0% (150 pcs)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 rounded-full" style={{ width: '1.0%' }} />
                </div>
              </div>

              <div className="pt-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Invariant: </strong>
                All rejected unit costs are absorbed directly into the accepted unit cost.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Second Statistics Row: Grain Mix & Baker Rankings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Teff Variety Mix */}
        {isWidgetVisible('teff_variety_mix') && (
          <Card className="lg:col-span-6 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Boxes className="h-4 w-4 text-sky-600" />
                Raw Teff Grain Formulation Mix
              </CardTitle>
              <CardDescription className="text-xs">
                Active batch consumption across pure Magna, Sergegna, and Tikur teff lots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-amber-100 border border-amber-300" />
                  <div>
                    <div className="font-bold text-foreground">White Magna Teff (ነጭ ማኛ)</div>
                    <div className="text-[11px] text-muted-foreground">High purity premium hotel batches</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono">55% Share</div>
                  <div className="text-[10px] text-muted-foreground">4,200 kg remaining</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-amber-600/70" />
                  <div>
                    <div className="font-bold text-foreground">Mixed Sergegna Teff (ሰርገኛ)</div>
                    <div className="text-[11px] text-muted-foreground">Balanced restaurant formulation</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono">30% Share</div>
                  <div className="text-[10px] text-muted-foreground">2,300 kg remaining</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-amber-950" />
                  <div>
                    <div className="font-bold text-foreground">Brown Tikur Teff (ጥቁር ጤፍ)</div>
                    <div className="text-[11px] text-muted-foreground">High iron traditional blend</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono">15% Share</div>
                  <div className="text-[10px] text-muted-foreground">1,150 kg remaining</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Baker Productivity Rankings */}
        {isWidgetVisible('baker_productivity') && (
          <Card className="lg:col-span-6 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Award className="h-4 w-4 text-emerald-600" />
                Baker Productivity & Speed Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Performance rankings by accepted output quantity and low defect ratios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60">
                {[
                  { rank: '1', name: 'Almaz Tadesse', speed: '52 pcs/hr', accepted: '1,840 pcs', yield: '97.2%', badge: 'Gold Baker' },
                  { rank: '2', name: 'Genet Wolde', speed: '48 pcs/hr', accepted: '1,680 pcs', yield: '96.5%', badge: 'Silver Baker' },
                  { rank: '3', name: 'Tigist Bekele', speed: '45 pcs/hr', accepted: '1,520 pcs', yield: '95.1%', badge: 'Master Baker' },
                  { rank: '4', name: 'Hiwot Assefa', speed: '41 pcs/hr', accepted: '1,390 pcs', yield: '94.8%', badge: 'Baker' },
                ].map((baker) => (
                  <div key={baker.rank} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat font-bold text-xs">
                        #{baker.rank}
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">{baker.name}</span>
                        <div className="text-[11px] text-muted-foreground">{baker.speed} average speed</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-foreground">{baker.accepted}</span>
                      <div className="text-[11px] text-emerald-600 font-medium">{baker.yield} yield</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Grid: Active Sessions & Security Box */}
      {isWidgetVisible('session_monitor') && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active Sessions Tracking */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-forest dark:text-oat" />
                    Active Device Sessions ({sessions.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Real-time database tracking of authenticated clients and tokens.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSessions(true)}
                    disabled={loadingSessions}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingSessions ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                  {sessions.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRevokeOthers}
                      disabled={loadingSessions}
                      className="text-xs"
                    >
                      <span>Revoke Other Devices</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {loadingSessions && sessions.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading active sessions…
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No active sessions found.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-md border border-border bg-muted p-1.5 text-muted-foreground">
                            {session.userAgent?.includes('Mobile') ? (
                              <Smartphone className="h-4 w-4" />
                            ) : (
                              <Laptop className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {session.userAgent?.split(' ')[0] ?? 'Web Browser'}
                              </span>
                              {session.isCurrent && (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span>IP: {session.ipAddress ?? '127.0.0.1'}</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last active: {formatDate(session.lastUsedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingId === session.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title={session.isCurrent ? 'Sign out this session' : 'Revoke device session'}
                        >
                          {revokingId === session.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Security Architecture Box */}
          <div>
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-forest dark:text-oat" />
                  Security Architecture
                </CardTitle>
                <CardDescription className="text-xs">
                  How KD PLC workspace protects credentials and business ledgers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <p className="font-semibold text-foreground">
                    HttpOnly & SameSite Protection
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Access tokens are held strictly in browser secure cookie jars.
                    JavaScript code cannot read the cookie, making XSS token theft impossible.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <p className="font-semibold text-foreground">
                    Automatic Token Rotation
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Every refresh cycle burns the old refresh token and issues a new pair.
                    Replay attempts immediately revoke the entire token family.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <p className="font-semibold text-foreground">
                    Active Permissions ({auth.permissions.length})
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                    {auth.permissions.map((p: string) => (
                      <span
                        key={p}
                        className="rounded bg-background px-1.5 py-0.5 font-mono text-[9px] text-foreground border border-border"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bakery Roles & Permission Matrix Section */}
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-forest dark:text-oat" />
              <CardTitle className="text-sm font-bold">
                Bakery Roles & Permission Matrix
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Standard template and business roles configured with granular permissions across baking, sales, and inventory stations.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {roles.length} roles available
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {loadingRoles ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading bakery roles and permissions…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Role selection tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
                {roles.map((r) => {
                  const isSelected = r.name === selectedRoleName
                  const opt = ROLE_OPTIONS.find((o) => o.value === r.name)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoleName(r.name)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-forest text-oat shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Key className="h-3 w-3" />
                      <span>{opt?.label ?? r.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSelected ? 'bg-oat/20 text-oat' : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {r.permissions.length}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Selected role details and permissions */}
              {(() => {
                const activeRole = roles.find((r) => r.name === selectedRoleName) ?? roles[0]
                if (!activeRole) return null
                const opt = ROLE_OPTIONS.find((o) => o.value === activeRole.name)

                return (
                  <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {opt?.label ?? activeRole.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {activeRole.description ?? opt?.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeRole.isSystem && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Standard system role
                          </span>
                        )}
                        {auth.role === activeRole.name && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-medium">
                            Your active role
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-border/60 pt-3">
                      <p className="text-xs font-semibold text-foreground mb-2">
                        Assigned Capabilities ({activeRole.permissions.length}):
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {activeRole.permissions.map((p: PermissionEntity) => (
                          <div
                            key={p.id}
                            className="flex flex-col justify-between rounded-md border border-border bg-card p-2 text-xs"
                          >
                            <code className="font-mono text-[11px] font-semibold text-forest dark:text-oat">
                              {p.code}
                            </code>
                            <span className="mt-0.5 text-[11px] text-muted-foreground">
                              {p.description ?? 'System granted permission'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
