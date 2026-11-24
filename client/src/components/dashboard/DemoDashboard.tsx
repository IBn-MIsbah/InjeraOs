import { useEffect, useState } from 'react'
import {
  reportsApi,
  type AuthContextResponse,
  type DashboardSummaryResult,
} from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  OnboardingDashboardWidget,
  OnboardingGuideModal,
} from '@/components/onboarding/OnboardingGuide'
import {
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  ChefHat,
  Coins,
  DollarSign,
  Flame,
  PackageCheck,
  TrendingUp,
} from 'lucide-react'

interface DemoDashboardProps {
  auth: AuthContextResponse
  onLogout: () => void
  onNavigateTab?: (tab: string) => void
}

type PerspectiveType = 'EXECUTIVE' | 'BAKER' | 'CASHIER' | 'STOREKEEPER'

export function DemoDashboard({ auth, onNavigateTab }: DemoDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummaryResult | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)

  // Default role perspective
  const userRole = (auth.role || 'OWNER').toUpperCase()
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN'
  const isFinancial = isOwnerOrAdmin || userRole === 'ACCOUNTANT' || userRole.includes('CASHIER') || userRole.includes('SALES')

  const initialPerspective: PerspectiveType = userRole.includes('BAKER')
    ? 'BAKER'
    : userRole.includes('CASHIER') || userRole.includes('SALES')
      ? 'CASHIER'
      : userRole.includes('STORE') || userRole.includes('INVENTORY')
        ? 'STOREKEEPER'
        : 'EXECUTIVE'

  const [perspective, setPerspective] = useState<PerspectiveType>(initialPerspective)

  useEffect(() => {
    let ignore = false
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
  }, [])

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val ?? 0)
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(num)
  }

  const revenueTrendDays =
    summary?.sevenDayRevenue && summary.sevenDayRevenue.length > 0
      ? summary.sevenDayRevenue
      : [
          { day: 'Mon', revenue: 0, orderCount: 0 },
          { day: 'Tue', revenue: 0, orderCount: 0 },
          { day: 'Wed', revenue: 0, orderCount: 0 },
          { day: 'Thu', revenue: 0, orderCount: 0 },
          { day: 'Fri', revenue: 0, orderCount: 0 },
          { day: 'Sat', revenue: 0, orderCount: 0 },
          { day: 'Sun', revenue: summary?.today.revenue ?? 0, orderCount: 0 },
        ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header: Greeting & Perspective Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {auth.business?.name ?? 'KD PLC'} &bull;{' '}
            <span className="font-medium text-foreground">{auth.user.name}</span> (
            {auth.role ?? 'OPERATOR'})
          </p>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Minimal Perspective Switcher */}
            <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
              {(['EXECUTIVE', 'BAKER', 'CASHIER', 'STOREKEEPER'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerspective(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    perspective === p
                      ? 'bg-forest text-oat shadow-xs dark:bg-oat dark:text-forest font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'EXECUTIVE'
                    ? 'Executive'
                    : p === 'BAKER'
                      ? 'Baker'
                      : p === 'CASHIER'
                        ? 'Cashier'
                        : 'Store'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuideOpen(true)}
              className="h-8 text-xs gap-1.5 border-border/80 cursor-pointer text-forest dark:text-oat"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Onboarding Guide</span>
            </Button>
          </div>
        )}
      </div>

      {/* Minimal Onboarding Setup Progress Widget */}
      {isOwnerOrAdmin && (
        <OnboardingDashboardWidget
          onNavigateTab={(tab) => onNavigateTab?.(tab)}
        />
      )}

      {/* 4 Minimal Top Status / KPI Cards - Adaptive by Perspective (12-Grid System) */}
      <div className="grid grid-cols-12 gap-3.5">
        {perspective === 'BAKER' ? (
          <>
            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Today's Mitad Output
                </CardTitle>
                <Flame className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {(summary?.qualityBreakdown?.totalProduced ?? 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pcs</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {(summary?.qualityBreakdown?.acceptedProduced ?? 0).toLocaleString()} accepted
                    </span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Baking Yield %
                </CardTitle>
                <Award className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                      {summary?.qualityBreakdown?.yieldPercent ?? 96.4}%
                    </div>
                    <span className="text-[11px] text-muted-foreground">Quality in-spec</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Defects & Rejections
                </CardTitle>
                <Flame className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-rose-600">
                      {(summary?.qualityBreakdown?.rejectedProduced ?? 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pcs</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Torn or burnt</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Active Mitad Batches
                </CardTitle>
                <ChefHat className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {summary?.operations.activeBatchesCount ?? 1}
                    </div>
                    <span className="text-[11px] text-sky-600 font-medium">Baking underway</span>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : perspective === 'CASHIER' ? (
          <>
            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Today's POS Collections
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {formatCurrency(summary?.today.revenue)}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">Cash & Telebirr</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Orders Closed
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-forest dark:text-oat" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {summary?.today.orderCount ?? 0}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Walk-in & wholesale</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Credit Receivables
                </CardTitle>
                <Coins className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {formatCurrency(summary?.operations.totalReceivables)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {summary?.operations.activeCustomersCount ?? 0} active accounts
                    </span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pending Deliveries
                </CardTitle>
                <PackageCheck className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {summary?.operations.pendingDeliveriesCount ?? 0}
                    </div>
                    <span className="text-[11px] text-sky-600 font-medium">Hotel dispatches</span>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : perspective === 'STOREKEEPER' ? (
          <>
            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Grain in Silos
                </CardTitle>
                <Boxes className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {(summary?.grainStock?.totalStockKg ?? 4250).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">KG</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Magna & Sergegna</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Prepared Flour
                </CardTitle>
                <ChefHat className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      840 <span className="text-xs font-normal text-muted-foreground">KG</span>
                    </div>
                    <span className="text-[11px] text-amber-600 font-medium">In hopper for mitad</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Active Batches
                </CardTitle>
                <Flame className="h-4 w-4 text-forest dark:text-oat" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {summary?.operations.activeBatchesCount ?? 1}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Consuming raw stock</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Finished Depot Stock
                </CardTitle>
                <PackageCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      3,200 <span className="text-xs font-normal text-muted-foreground">pcs</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">FIFO ready</span>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* Executive Perspective */
          <>
            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Today's Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {formatCurrency(summary?.today.revenue)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {summary?.today.orderCount ?? 0} orders recorded
                    </span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Mitad Output
                </CardTitle>
                <Flame className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {(summary?.qualityBreakdown?.totalProduced ?? 0).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pcs</span>
                    </div>
                    <span className="text-[11px] text-amber-600 font-medium">
                      {summary?.operations.activeBatchesCount ?? 1} active batches
                    </span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Quality Yield %
                </CardTitle>
                <Award className="h-4 w-4 text-forest dark:text-oat" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-forest dark:text-oat">
                      {summary?.qualityBreakdown?.yieldPercent ?? 96.4}%
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">In spec (&ge;85%)</span>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-12 sm:col-span-6 lg:col-span-3 border-border/80 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Credit Receivables
                </CardTitle>
                <Coins className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent className="pb-4 px-4">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                      {formatCurrency(summary?.operations.totalReceivables)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {summary?.operations.activeCustomersCount ?? 0} active accounts
                    </span>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Row 1: 7-Day Revenue Velocity (for Financial/Admin roles) & Quality Yield Breakdown (12-Grid System) */}
      <div className="grid grid-cols-12 gap-4">
        {/* 7-Day Revenue Bar Chart - Only visible to financial / admin perspectives */}
        {isFinancial && (
          <Card className="col-span-12 lg:col-span-7 border-border/80 shadow-2xs">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-forest dark:text-oat" />
                7-Day Revenue Trend
              </CardTitle>
              <span className="text-xs font-mono tabular-nums font-semibold text-muted-foreground">
                {summary?.sevenDayRevenue && summary.sevenDayRevenue.length > 0
                  ? formatCurrency(summary.sevenDayRevenue.reduce((s, d) => s + d.revenue, 0))
                  : ''}
              </span>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {loadingSummary ? (
                <div className="h-36 flex items-end justify-between gap-2 pt-4 border-b border-border/60">
                  {[30, 50, 40, 70, 60, 90, 65].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <Skeleton className="w-full max-w-[32px] rounded-t-sm" style={{ height: `${h}%` }} />
                      <Skeleton className="h-3 w-6" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-36 flex items-end justify-between gap-2 pt-4 border-b border-border/60">
                  {revenueTrendDays.map((item, idx) => {
                    const maxRev = Math.max(...revenueTrendDays.map((d) => d.revenue), 1)
                    const barHeight = Math.max(Math.round((item.revenue / maxRev) * 100), item.revenue > 0 ? 12 : 6)
                    const isToday = idx === revenueTrendDays.length - 1

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.revenue > 0 ? `${(item.revenue / 1000).toFixed(1)}k` : '0'}
                        </span>
                        <div
                          style={{ height: `${barHeight}%` }}
                          className={`w-full max-w-[32px] rounded-t transition-all ${
                            isToday
                              ? 'bg-forest dark:bg-oat shadow-xs'
                              : 'bg-forest/50 hover:bg-forest/75 dark:bg-oat/40 dark:hover:bg-oat/70'
                          }`}
                          title={`${item.day}: ${formatCurrency(item.revenue)}`}
                        />
                        <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                          {item.day}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quality Yield & Rejection Breakdown */}
        <Card className={`${isFinancial ? 'col-span-12 lg:col-span-5' : 'col-span-12'} border-border/80 shadow-2xs`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <ChefHat className="h-4 w-4 text-amber-500" />
              Mitad Quality Yield & Defect Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4 px-4">
            {loadingSummary ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Accepted Sellable</span>
                    <span className="font-bold text-forest dark:text-oat font-mono">
                      {summary?.qualityBreakdown?.yieldPercent ?? 100}% ({summary?.qualityBreakdown?.acceptedProduced ?? 0} pcs)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest dark:bg-oat rounded-full transition-all"
                      style={{ width: `${Math.min(summary?.qualityBreakdown?.yieldPercent ?? 100, 100)}%` }}
                    />
                  </div>
                </div>

                {summary?.qualityBreakdown?.defects && summary.qualityBreakdown.defects.length > 0 ? (
                  summary.qualityBreakdown.defects.map((defect) => (
                    <div key={defect.reason} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{defect.reason}</span>
                        <span className="font-medium text-rose-600 font-mono">
                          {defect.percent}% ({defect.count} pcs)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{ width: `${Math.min(defect.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pt-2 text-center text-xs text-muted-foreground">
                    Zero defect rate recorded for today's batches.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Grain Inventory Mix & Baker Output Leaderboard (12-Grid System) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Teff Grain Formulation Mix */}
        <Card className="col-span-12 lg:col-span-6 border-border/80 shadow-2xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Boxes className="h-4 w-4 text-sky-600" />
              Teff Grain Stock Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 px-4">
            {loadingSummary ? (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : summary?.grainStock?.materials && summary.grainStock.materials.length > 0 ? (
              summary.grainStock.materials.map((mat) => (
                <div
                  key={mat.materialId}
                  className="flex items-center justify-between text-xs bg-muted/30 px-3 py-2 rounded-lg border border-border/60"
                >
                  <div className="font-semibold text-foreground">{mat.materialName}</div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-bold">{mat.percentage}%</span>{' '}
                    <span className="text-[11px] text-muted-foreground">
                      ({mat.remainingKg.toLocaleString()} kg)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No raw grain lots active.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Baker Output Leaderboard */}
        <Card className="col-span-12 lg:col-span-6 border-border/80 shadow-2xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Award className="h-4 w-4 text-emerald-600" />
              Top Baker Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            {loadingSummary ? (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : summary?.topBakers && summary.topBakers.length > 0 ? (
              <div className="divide-y divide-border/60">
                {summary.topBakers.slice(0, 3).map((baker, idx) => (
                  <div key={baker.employeeId} className="py-2 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest/10 text-forest dark:bg-oat/15 dark:text-oat font-bold text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-foreground">{baker.name}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="font-bold text-foreground">{baker.acceptedCount} pcs</span>{' '}
                      <span className="text-[11px] text-emerald-600 font-medium">({baker.yieldPercent}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No baker productivity recorded yet today.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Guide Modal */}
      <OnboardingGuideModal
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onNavigateTab={(tab) => onNavigateTab?.(tab)}
      />
    </div>
  )
}
