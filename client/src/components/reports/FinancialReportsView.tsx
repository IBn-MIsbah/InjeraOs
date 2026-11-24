import { useEffect, useState, useId } from 'react'
import {
  reportsApi,
  branchesApi,
  type FinancialReportResult,
  type BakerProductivityReportItem,
  type InventoryValuationReportResult,
  type BranchEntity,
} from '@/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  Calendar,
  Filter,
  Users,
  Warehouse,
  Boxes,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  PieChart,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all'

export function FinancialReportsView() {
  const branchSelectId = useId()
  const [preset, setPreset] = useState<DatePreset>('month')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [branches, setBranches] = useState<BranchEntity[]>([])

  const [financialData, setFinancialData] = useState<FinancialReportResult | null>(null)
  const [bakerData, setBakerData] = useState<BakerProductivityReportItem[]>([])
  const [inventoryData, setInventoryData] = useState<InventoryValuationReportResult | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'bakers' | 'inventory'>('pnl')

  const getDateRange = (selectedPreset: DatePreset): { startDate?: string; endDate?: string } => {
    const now = new Date()
    if (selectedPreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      return { startDate: start, endDate: end }
    }
    if (selectedPreset === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      return { startDate: start.toISOString(), endDate: now.toISOString() }
    }
    if (selectedPreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      return { startDate: start, endDate: now.toISOString() }
    }
    if (selectedPreset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString()
      return { startDate: start, endDate: now.toISOString() }
    }
    return {}
  }

  const loadReports = async () => {
    setLoading(true)
    try {
      const range = getDateRange(preset)
      const queryParams = {
        ...(range.startDate ? { startDate: range.startDate } : {}),
        ...(range.endDate ? { endDate: range.endDate } : {}),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      }

      const [finRes, bkrRes, invRes] = await Promise.all([
        reportsApi.getFinancialReport(queryParams),
        reportsApi.getBakerProductivityReport(queryParams),
        reportsApi.getInventoryValuationReport(selectedBranchId ? { branchId: selectedBranchId } : undefined),
      ])

      setFinancialData(finRes)
      setBakerData(bkrRes)
      setInventoryData(invRes)
    } catch (err) {
      console.error('Failed to load reports:', err)
      toast.error('Failed to load financial reports', {
        description: 'Check your server connection or try a different filter range.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    branchesApi
      .getBranches()
      .then((data) => setBranches(data))
      .catch((err) => console.error('Failed to load branches for reports:', err))
  }, [])

  useEffect(() => {
    let ignore = false
    const range = getDateRange(preset)
    const queryParams = {
      ...(range.startDate ? { startDate: range.startDate } : {}),
      ...(range.endDate ? { endDate: range.endDate } : {}),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    }

    void Promise.all([
      reportsApi.getFinancialReport(queryParams),
      reportsApi.getBakerProductivityReport(queryParams),
      reportsApi.getInventoryValuationReport(selectedBranchId ? { branchId: selectedBranchId } : undefined),
    ])
      .then(([finRes, bkrRes, invRes]) => {
        if (ignore) return
        setFinancialData(finRes)
        setBakerData(bkrRes)
        setInventoryData(invRes)
        setLoading(false)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load reports:', err)
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [preset, selectedBranchId])

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val ?? 0)
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(num)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Financial Intelligence & Performance
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Accrual vs. cash financial statements, COGS FIFO allocation, baker yield KPIs, and inventory valuation.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset buttons */}
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
            {(['today', 'week', 'month', 'year', 'all'] as DatePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  preset === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>

          {/* Branch filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <label htmlFor={branchSelectId} className="sr-only">Filter by Station</label>
            <select
              id={branchSelectId}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Stations & Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          type="button"
          onClick={() => setActiveSubTab('pnl')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'pnl'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Executive P&L Statement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bakers')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'bakers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Baker Yield & Productivity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
            activeSubTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>Balance Sheet Inventory Valuation</span>
        </button>
      </div>

      {loading && !financialData ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeSubTab === 'pnl' ? (
        /* P&L Statement View */
        <div className="space-y-6">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Accrual Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(financialData?.profitability.revenue)}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Gross: {formatCurrency(financialData?.profitability.grossSales)}</span>
                  <span className="text-rose-500">
                    Discounts: -{formatCurrency(financialData?.profitability.totalDiscounts)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Direct COGS</span>
                  <Boxes className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(financialData?.profitability.cogs)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  FIFO Material, Labour & Overhead absorption
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Gross Profit</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(financialData?.profitability.grossProfit)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {financialData?.profitability.grossMarginPercent?.toFixed(1) ?? '0.0'}%
                  </span>
                  <span className="text-muted-foreground">Gross Margin</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Net Operating Profit</span>
                  {(financialData?.profitability.netOperatingProfit ?? 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  )}
                </div>
                <div
                  className={`mt-2 text-2xl font-bold tracking-tight ${
                    (financialData?.profitability.netOperatingProfit ?? 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(financialData?.profitability.netOperatingProfit)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-foreground">
                    {financialData?.profitability.netOperatingMarginPercent?.toFixed(1) ?? '0.0'}%
                  </span>
                  <span className="text-muted-foreground">Net Margin</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow & Ledger Separation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Cash Collections vs Accrued Receivables
                </CardTitle>
                <CardDescription className="text-xs">
                  Separating delivered sales revenue from actual cash collected and open credit balances.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div>
                    <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      Actual Cash Collections
                    </div>
                    <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                      {formatCurrency(financialData?.cashFlowAndCredit.cashCollected)}
                    </div>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div>
                    <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Active Accounts Receivable (AR)
                    </div>
                    <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                      {formatCurrency(financialData?.cashFlowAndCredit.accountsReceivable)}
                    </div>
                  </div>
                  <Calendar className="h-6 w-6 text-amber-600" />
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>
                    <strong>Total Sales Invoices:</strong> {financialData?.profitability.totalSalesCount ?? 0}
                  </p>
                  <p>
                    <strong>Customers with Outstanding Balance:</strong> {financialData?.cashFlowAndCredit.customersWithDebtCount ?? 0}
                  </p>
                  <p>
                    <strong>Production Batches Baked:</strong> {financialData?.productionOutput.totalBatchesCount ?? 0} ({financialData?.productionOutput.totalAcceptedProduced?.toLocaleString() ?? 0} pcs)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Operating Expenses Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-500" />
                  Operating Expenses (OPEX) by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  General and administrative expenses distinct from direct production overhead.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-medium text-muted-foreground">Total OPEX</span>
                  <span className="text-base font-bold text-rose-600">
                    {formatCurrency(financialData?.profitability.operatingExpenses)}
                  </span>
                </div>

                {financialData?.profitability.expensesByCategory &&
                Object.keys(financialData.profitability.expensesByCategory).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(financialData.profitability.expensesByCategory).map(([catName, amount]) => {
                      const totalOpex = Number(financialData.profitability.operatingExpenses) || 1
                      const pct = Math.min(100, Math.round((Number(amount) / totalOpex) * 100))
                      return (
                        <div key={catName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{catName}</span>
                            <span className="font-semibold text-muted-foreground">
                              {formatCurrency(amount)}{' '}
                              <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No operating expenses recorded for this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeSubTab === 'bakers' ? (
        /* Baker Yield & Productivity Report */
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Baker Yield & Operational Speed Rankings
            </CardTitle>
            <CardDescription className="text-xs">
              Quality tracking, output per baking shift, and scrap/rejection rate analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-3 font-medium">Baker Employee</th>
                    <th className="pb-3 font-medium text-right">Records</th>
                    <th className="pb-3 font-medium text-right">Total Quantity</th>
                    <th className="pb-3 font-medium text-right">Accepted Output</th>
                    <th className="pb-3 font-medium text-right">Rejected / Scrap</th>
                    <th className="pb-3 font-medium text-right">Yield %</th>
                    <th className="pb-3 font-medium text-right">Rejection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bakerData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No baker production data found for the selected time window.
                      </td>
                    </tr>
                  ) : (
                    bakerData.map((item) => {
                      const isHighPerforming = item.yieldPercent >= 95
                      return (
                        <tr key={item.employeeId} className="hover:bg-muted/30">
                          <td className="py-3 font-medium text-foreground flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                              {item.employeeName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{item.employeeName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{item.employeeNumber}</div>
                            </div>
                          </td>
                          <td className="py-3 text-right text-muted-foreground font-mono">
                            {item.recordCount}
                          </td>
                          <td className="py-3 text-right font-medium text-foreground font-mono">
                            {item.totalQuantity.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                            {item.acceptedQuantity.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-rose-500 font-mono">
                            {item.rejectedQuantity.toLocaleString()}
                          </td>
                          <td className="py-3 text-right font-bold">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${
                                isHighPerforming
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {item.yieldPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-muted-foreground">
                            {item.rejectionRatePercent.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Inventory Valuation Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-muted-foreground">Total Inventory Assets</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(inventoryData?.totalInventoryValuation)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Combined Raw Materials & Finished Goods
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-muted-foreground">Raw Materials Valuation</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(inventoryData?.rawMaterials.totalValuation)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  FIFO tracked teff, flour, yeast, packaging
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-muted-foreground">Finished Goods Valuation</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(inventoryData?.finishedGoods.totalValuation)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Baked batches ready for dispatch & POS
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Raw Material Inventory Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  Raw Materials Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 font-medium">Material</th>
                        <th className="pb-2 font-medium text-right">In Stock</th>
                        <th className="pb-2 font-medium text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inventoryData?.rawMaterials.materials && inventoryData.rawMaterials.materials.length > 0 ? (
                        inventoryData.rawMaterials.materials.map((m) => (
                          <tr key={m.materialId} className="hover:bg-muted/30">
                            <td className="py-2.5 font-medium text-foreground">{m.materialName}</td>
                            <td className="py-2.5 text-right font-mono text-muted-foreground">
                              {m.totalRemainingQuantity.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium text-foreground">
                              {formatCurrency(m.totalValuation)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground">
                            No active raw material stock found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Finished Goods Inventory Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-cyan-600" />
                  Finished Goods Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium text-right">Available Pcs</th>
                        <th className="pb-2 font-medium text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inventoryData?.finishedGoods.products && inventoryData.finishedGoods.products.length > 0 ? (
                        inventoryData.finishedGoods.products.map((p) => (
                          <tr key={p.productId} className="hover:bg-muted/30">
                            <td className="py-2.5 font-medium text-foreground">{p.productName}</td>
                            <td className="py-2.5 text-right font-mono text-muted-foreground">
                              {p.totalRemainingQuantity.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono font-medium text-foreground">
                              {formatCurrency(p.totalValuation)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground">
                            No finished goods in stock.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
