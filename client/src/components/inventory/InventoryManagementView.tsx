import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  inventoryApi,
  productionApi,
  branchesApi,
  materialsApi,
  type StockLocationEntity,
  type FinishedInventoryLotEntity,
  type RawMaterialStockSummary,
  type LotReconciliationReport,
  type ProductionBatchEntity,
  type BranchEntity,
  type MaterialLotEntity,
} from '@/lib/api'
import {
  createStockLocationSchema,
  postProductionToStockSchema,
  recordFinishedAdjustmentSchema,
  transferFinishedStockSchema,
  recordRawAdjustmentSchema,
  type CreateStockLocationInput,
  type PostProductionToStockInput,
  type RecordFinishedAdjustmentInput,
  type TransferFinishedStockInput,
  type RecordRawAdjustmentInput,
} from '@/schemas/inventory.schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Warehouse,
  Boxes,
  ArrowRightLeft,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

type SubTab = 'finished' | 'raw' | 'locations' | 'reconciliation'

export function InventoryManagementView() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('finished')
  const [isLoading, setIsLoading] = useState(false)

  // Data states
  const [finishedLots, setFinishedLots] = useState<FinishedInventoryLotEntity[]>([])
  const [saleReadyLots, setSaleReadyLots] = useState<FinishedInventoryLotEntity[]>([])
  const [rawStock, setRawStock] = useState<RawMaterialStockSummary[]>([])
  const [locations, setLocations] = useState<StockLocationEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [completedBatches, setCompletedBatches] = useState<ProductionBatchEntity[]>([])
  const [rawMaterialLots, setRawMaterialLots] = useState<MaterialLotEntity[]>([])

  // Filtering states
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isAdjustLotModalOpen, setIsAdjustLotModalOpen] = useState(false)
  const [selectedLotForAdjust, setSelectedLotForAdjust] = useState<FinishedInventoryLotEntity | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [selectedLotForTransfer, setSelectedLotForTransfer] = useState<FinishedInventoryLotEntity | null>(null)
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)
  const [isRawAdjustModalOpen, setIsRawAdjustModalOpen] = useState(false)
  const [selectedLotForRecon, setSelectedLotForRecon] = useState<FinishedInventoryLotEntity | null>(null)
  const [reconReport, setReconReport] = useState<LotReconciliationReport | null>(null)
  const [isLoadingRecon, setIsLoadingRecon] = useState(false)

  // Forms
  const postForm = useForm<PostProductionToStockInput>({
    resolver: zodResolver(postProductionToStockSchema),
    defaultValues: {
      expiryHours: 72,
    },
  })

  const adjustLotForm = useForm<RecordFinishedAdjustmentInput>({
    resolver: zodResolver(recordFinishedAdjustmentSchema),
    defaultValues: {
      movementType: 'DAMAGE_OUT',
      quantity: 1,
    },
  })

  const transferForm = useForm<TransferFinishedStockInput>({
    resolver: zodResolver(transferFinishedStockSchema),
    defaultValues: {
      quantity: 1,
    },
  })

  const locationForm = useForm<CreateStockLocationInput>({
    resolver: zodResolver(createStockLocationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const rawAdjustForm = useForm<RecordRawAdjustmentInput>({
    resolver: zodResolver(recordRawAdjustmentSchema),
    defaultValues: {
      movementType: 'ADJUSTMENT_OUT',
      quantity: 1,
    },
  })

  // Load core data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [lotsData, saleReadyData, rawData, locsData, branchesData] = await Promise.all([
        inventoryApi.getFinishedLots(),
        inventoryApi.getSaleReadyStock(),
        inventoryApi.getRawStock(),
        inventoryApi.getLocations(),
        branchesApi.getBranches(),
      ])

      setFinishedLots(lotsData)
      setSaleReadyLots(saleReadyData)
      setRawStock(rawData)
      setLocations(locsData)
      setBranches(branchesData)
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to load inventory'
      toast.error(msg || 'Network error loading inventory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    void Promise.all([
      inventoryApi.getFinishedLots(),
      inventoryApi.getSaleReadyStock(),
      inventoryApi.getRawStock(),
      inventoryApi.getLocations(),
      branchesApi.getBranches(),
    ])
      .then(([lotsData, saleReadyData, rawData, locsData, branchesData]) => {
        if (ignore) return
        setFinishedLots(lotsData)
        setSaleReadyLots(saleReadyData)
        setRawStock(rawData)
        setLocations(locsData)
        setBranches(branchesData)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load inventory data:', err)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Load completed batches when opening post-production modal
  const handleOpenPostModal = async () => {
    try {
      const batches = await productionApi.getBatches({ status: 'COMPLETED' })
      setCompletedBatches(batches)
      postForm.reset({
        productionBatchId: batches[0]?.id || '',
        stockLocationId: locations[0]?.id || '',
        expiryHours: 72,
        notes: '',
      })
      setIsPostModalOpen(true)
    } catch {
      toast.error('Failed to load completed production batches')
    }
  }

  // Load raw material lots when opening raw adjust modal
  const handleOpenRawAdjustModal = async () => {
    try {
      const lots = await materialsApi.getLots()
      setRawMaterialLots(lots.filter((l) => Number(l.remainingQuantity) > 0))
      rawAdjustForm.reset({
        materialLotId: lots[0]?.id || '',
        movementType: 'ADJUSTMENT_OUT',
        quantity: 1,
        notes: '',
      })
      setIsRawAdjustModalOpen(true)
    } catch {
      toast.error('Failed to load material lots')
    }
  }

  // Submit Post Production
  const onSubmitPostProduction = async (data: PostProductionToStockInput) => {
    try {
      await inventoryApi.postProductionToStock(data)
      toast.success('Batch accepted units posted to finished goods inventory!')
      setIsPostModalOpen(false)
      loadData()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Posting failed'
      toast.error(msg || 'Posting production to stock failed')
    }
  }

  // Open Finished Lot Adjustment Modal
  const handleOpenAdjustLotModal = (lot: FinishedInventoryLotEntity) => {
    setSelectedLotForAdjust(lot)
    adjustLotForm.reset({
      finishedInventoryLotId: lot.id,
      movementType: 'DAMAGE_OUT',
      quantity: 1,
      reason: 'Baking damage / handling breakage',
      notes: '',
    })
    setIsAdjustLotModalOpen(true)
  }

  // Submit Finished Lot Adjustment
  const onSubmitAdjustLot = async (data: RecordFinishedAdjustmentInput) => {
    try {
      await inventoryApi.adjustFinishedStock(data)
      toast.success('Finished inventory adjusted successfully!')
      setIsAdjustLotModalOpen(false)
      setSelectedLotForAdjust(null)
      loadData()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Adjustment failed'
      toast.error(msg || 'Finished lot adjustment failed')
    }
  }

  // Open Transfer Modal
  const handleOpenTransferModal = (lot: FinishedInventoryLotEntity) => {
    setSelectedLotForTransfer(lot)
    const otherLocations = locations.filter((l) => l.id !== lot.stockLocationId)
    transferForm.reset({
      sourceLotId: lot.id,
      targetStockLocationId: otherLocations[0]?.id || '',
      quantity: 1,
      notes: '',
    })
    setIsTransferModalOpen(true)
  }

  // Submit Transfer
  const onSubmitTransfer = async (data: TransferFinishedStockInput) => {
    try {
      await inventoryApi.transferFinishedStock(data)
      toast.success('Finished stock transferred to destination location!')
      setIsTransferModalOpen(false)
      setSelectedLotForTransfer(null)
      loadData()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Transfer failed'
      toast.error(msg || 'Stock transfer failed')
    }
  }

  // Open Location Modal
  const handleOpenAddLocationModal = () => {
    locationForm.reset({
      branchId: branches[0]?.id || '',
      name: '',
      description: '',
    })
    setIsAddLocationModalOpen(true)
  }

  // Submit New Location
  const onSubmitLocation = async (data: CreateStockLocationInput) => {
    try {
      await inventoryApi.createLocation(data)
      toast.success('Stock location created!')
      setIsAddLocationModalOpen(false)
      loadData()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Creation failed'
      toast.error(msg || 'Could not create stock location')
    }
  }

  // Submit Raw Material Adjustment
  const onSubmitRawAdjust = async (data: RecordRawAdjustmentInput) => {
    try {
      await inventoryApi.adjustRawStock(data)
      toast.success('Raw material stock adjusted successfully!')
      setIsRawAdjustModalOpen(false)
      loadData()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Adjustment failed'
      toast.error(msg || 'Raw stock adjustment failed')
    }
  }

  // Load Lot Reconciliation
  const handleViewReconciliation = async (lot: FinishedInventoryLotEntity) => {
    setSelectedLotForRecon(lot)
    setIsLoadingRecon(true)
    try {
      const report = await inventoryApi.getLotReconciliation(lot.id)
      setReconReport(report)
      setActiveSubTab('reconciliation')
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Reconciliation failed'
      toast.error(msg || 'Could not fetch lot movements reconciliation')
    } finally {
      setIsLoadingRecon(false)
    }
  }

  // Metrics calculations
  const totalSellableUnits = finishedLots
    .filter((l) => l.status === 'AVAILABLE')
    .reduce((sum, l) => sum + Number(l.remainingQuantity), 0)

  const totalFinishedValuation = finishedLots
    .filter((l) => l.status === 'AVAILABLE')
    .reduce((sum, l) => sum + Number(l.remainingQuantity) * Number(l.unitCost), 0)

  const expiringSoonCount = finishedLots.filter((l) => l.isExpiringSoon && l.status === 'AVAILABLE').length

  const totalRawValuation = rawStock.reduce((sum, m) => sum + Number(m.totalStockValuation), 0)
  const lowStockCount = rawStock.filter((m) => m.isLowStock).length

  // Filter finished lots
  const filteredFinishedLots = finishedLots.filter((lot) => {
    const matchesBranch = selectedBranchId === 'all' || lot.branchId === selectedBranchId
    const matchesStatus = selectedStatus === 'all' || lot.status === selectedStatus
    const matchesSearch =
      !searchTerm ||
      (lot.productName && lot.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lot.batchNumber && lot.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lot.locationName && lot.locationName.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesBranch && matchesStatus && matchesSearch
  })

  // Filter raw stock
  const filteredRawStock = rawStock.filter((mat) => {
    return (
      !searchTerm ||
      mat.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mat.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-cyan-600" />
            Finished Goods, FIFO Lots & Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage finished injera stock, enforce FIFO rotation, track freshness & shelf-life, and audit movement reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenPostModal}
            className="h-8 gap-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Post Production to Stock
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sellable Finished Injera</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold text-foreground">
              {totalSellableUnits.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pcs</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Available unexpired lots</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Finished Stock Value</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold text-cyan-600">
              {totalFinishedValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-muted-foreground">ETB</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Based on batch cost records</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Raw Material Valuation</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold text-emerald-600">
              {totalRawValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-muted-foreground">ETB</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{rawStock.length} materials tracked</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Freshness & Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${expiringSoonCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {expiringSoonCount}
              </span>
              <span className="text-[10px] text-muted-foreground">expiring soon /</span>
              <span className={`text-lg font-bold ${lowStockCount > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {lowStockCount}
              </span>
              <span className="text-[10px] text-muted-foreground">low stock</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-border/80 overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('finished')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
              activeSubTab === 'finished'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Finished Goods & FIFO Lots ({finishedLots.length})
          </button>
          <button
            onClick={() => setActiveSubTab('raw')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
              activeSubTab === 'raw'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            Raw Material Stock & Valuation ({rawStock.length})
          </button>
          <button
            onClick={() => setActiveSubTab('locations')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
              activeSubTab === 'locations'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Locations & Transfers ({locations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('reconciliation')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors shrink-0 ${
              activeSubTab === 'reconciliation'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Movement Audit & Reconciliation
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Finished Goods & FIFO Lots */}
      {activeSubTab === 'finished' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search lots, batches, products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs w-60"
                />
              </div>

              {/* Branch filter */}
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="DEPLETED">DEPLETED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Showing {filteredFinishedLots.length} lots &bull; Ordered by FIFO sequence
            </div>
          </div>

          {/* Finished Lots Table */}
          <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px]">FIFO Rank</TableHead>
                  <TableHead className="text-[11px]">Product & Code</TableHead>
                  <TableHead className="text-[11px]">Location & Branch</TableHead>
                  <TableHead className="text-[11px]">Batch #</TableHead>
                  <TableHead className="text-[11px]">Freshness & Expiry</TableHead>
                  <TableHead className="text-[11px] text-right">Available Qty</TableHead>
                  <TableHead className="text-[11px] text-right">Unit Cost</TableHead>
                  <TableHead className="text-[11px] text-right">Lot Value</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFinishedLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                      No finished inventory lots found. Post a completed batch to create stock!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFinishedLots.map((lot) => {
                    const fifoRank = saleReadyLots.findIndex((s) => s.id === lot.id)
                    const isNextToDispatch = fifoRank === 0 && lot.status === 'AVAILABLE'

                    return (
                      <TableRow key={lot.id} className="text-xs">
                        {/* FIFO Rank */}
                        <TableCell>
                          {lot.status === 'AVAILABLE' ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isNextToDispatch
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isNextToDispatch && <CheckCircle2 className="h-3 w-3" />}#
                              {fifoRank >= 0 ? fifoRank + 1 : '—'}
                              {isNextToDispatch && ' (Next)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </TableCell>

                        {/* Product */}
                        <TableCell>
                          <div className="font-medium text-foreground">{lot.productName ?? 'Injera Product'}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {lot.productCode} {lot.productSize ? `(${lot.productSize})` : ''}
                          </div>
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          <div className="font-medium text-foreground">{lot.locationName ?? 'Stock Rack'}</div>
                          <div className="text-[10px] text-muted-foreground">{lot.branchName}</div>
                        </TableCell>

                        {/* Batch */}
                        <TableCell>
                          <span className="font-mono text-[11px]">{lot.batchNumber ?? 'BATCH-N/A'}</span>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(lot.productionDate).toLocaleDateString()}
                          </div>
                        </TableCell>

                        {/* Freshness & Expiry */}
                        <TableCell>
                          {lot.expiryAt ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                                  lot.isExpired
                                    ? 'text-rose-600'
                                    : lot.isExpiringSoon
                                    ? 'text-amber-600'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {lot.isExpired
                                  ? 'EXPIRED'
                                  : lot.isExpiringSoon
                                  ? `Expiring soon (~${lot.hoursToExpiry}h)`
                                  : `~${lot.hoursToExpiry}h shelf-life`}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                Until {new Date(lot.expiryAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">No expiry set</span>
                          )}
                        </TableCell>

                        {/* Qty */}
                        <TableCell className="text-right">
                          <div className="font-bold text-foreground">
                            {lot.remainingQuantity}{' '}
                            <span className="text-[10px] font-normal text-muted-foreground">/ {lot.originalQuantity} pcs</span>
                          </div>
                        </TableCell>

                        {/* Unit Cost */}
                        <TableCell className="text-right font-mono text-[11px]">
                          {Number(lot.unitCost).toFixed(2)} ETB
                        </TableCell>

                        {/* Lot Value */}
                        <TableCell className="text-right font-mono text-[11px] font-semibold text-cyan-600">
                          {(Number(lot.remainingQuantity) * Number(lot.unitCost)).toFixed(2)} ETB
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              lot.status === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : lot.status === 'DEPLETED'
                                ? 'bg-muted text-muted-foreground'
                                : lot.status === 'EXPIRED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {lot.status}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lot.status === 'AVAILABLE' && lot.remainingQuantity > 0 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAdjustLotModal(lot)}
                                  className="h-7 px-2 text-[10px] text-amber-600 hover:text-amber-700"
                                  title="Write-off damage / spoilage or manual adjustment"
                                >
                                  Adjust
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenTransferModal(lot)}
                                  className="h-7 px-2 text-[10px] text-cyan-600 hover:text-cyan-700"
                                  title="Transfer to another stock location"
                                >
                                  Transfer
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReconciliation(lot)}
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                              title="Audit movement reconciliation"
                            >
                              Audit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Raw Material Stock & Valuation */}
      {activeSubTab === 'raw' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search raw materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs w-60"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenRawAdjustModal}
              className="h-8 gap-1 text-xs border-amber-600 text-amber-600 hover:bg-amber-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Raw Material Stock Adjustment
            </Button>
          </div>

          <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px]">Material & Code</TableHead>
                  <TableHead className="text-[11px]">Category</TableHead>
                  <TableHead className="text-[11px]">Unit</TableHead>
                  <TableHead className="text-[11px] text-right">Remaining Stock</TableHead>
                  <TableHead className="text-[11px] text-right">Min Stock Threshold</TableHead>
                  <TableHead className="text-[11px]">Stock Health</TableHead>
                  <TableHead className="text-[11px] text-right">Avg Unit Cost</TableHead>
                  <TableHead className="text-[11px] text-right">Total Valuation</TableHead>
                  <TableHead className="text-[11px] text-right">Active Lots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRawStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                      No raw material stock records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRawStock.map((mat) => (
                    <TableRow key={mat.materialId} className="text-xs">
                      <TableCell>
                        <div className="font-semibold text-foreground">{mat.materialName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{mat.materialCode}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{mat.categoryName ?? '—'}</TableCell>
                      <TableCell className="font-mono">{mat.unitSymbol}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {mat.totalRemainingQuantity.toLocaleString()} {mat.unitSymbol}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {mat.minimumStock.toLocaleString()} {mat.unitSymbol}
                      </TableCell>
                      <TableCell>
                        {mat.isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <ShieldAlert className="h-3 w-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            HEALTHY
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px]">
                        {mat.averageUnitCost.toFixed(2)} ETB
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600">
                        {mat.totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        ETB
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{mat.lotsCount} lots</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Stock Locations & Transfers */}
      {activeSubTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Warehouse & Bakery Stock Locations</h2>
              <p className="text-xs text-muted-foreground">
                Cooling racks, packaging bays, dispatch staging shelves, and holding rooms.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddLocationModal}
              className="h-8 gap-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stock Location
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => {
              const lotsInLocation = finishedLots.filter(
                (l) => l.stockLocationId === loc.id && l.status === 'AVAILABLE'
              )
              const unitsInLocation = lotsInLocation.reduce((sum, l) => sum + Number(l.remainingQuantity), 0)

              return (
                <Card key={loc.id} className="border-border/80 shadow-xs">
                  <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">{loc.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{loc.branchName ?? 'Main Branch'}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                        loc.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {loc.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground">{loc.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <span className="text-muted-foreground">Current Stock:</span>
                      <span className="font-bold text-foreground">{unitsInLocation.toLocaleString()} pcs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Active Batches/Lots:</span>
                      <span className="text-foreground">{lotsInLocation.length}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Movement Audit & Reconciliation */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Finished Goods Lot Movement Audit Trail</h2>
              <p className="text-xs text-muted-foreground">
                Verify that balance = Total IN - Total OUT for every finished lot to prevent ghost units or untracked shrinkage.
              </p>
            </div>
            {selectedLotForRecon && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewReconciliation(selectedLotForRecon)}
                disabled={isLoadingRecon}
                className="h-8 gap-1 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRecon ? 'animate-spin' : ''}`} />
                Re-verify
              </Button>
            )}
          </div>

          {!selectedLotForRecon ? (
            <Card className="border-border/60 p-8 text-center text-xs text-muted-foreground">
              Select an inventory lot from the &quot;Finished Goods &amp; FIFO Lots&quot; tab and click &quot;Audit&quot; to inspect its movement ledger and verification status.
            </Card>
          ) : isLoadingRecon ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading audit trail...</div>
          ) : reconReport ? (
            <div className="space-y-4">
              {/* Reconciliation Status Card */}
              <div
                className={`rounded-lg border p-4 ${
                  reconReport.reconciles
                    ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">Lot Reconciliation Status:</span>
                      {reconReport.reconciles ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          100% RECONCILED (BALANCE MATCHES)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          DISCREPANCY DETECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Product: <strong className="text-foreground">{selectedLotForRecon.productName}</strong> &bull; Batch:{' '}
                      <strong className="text-foreground">{selectedLotForRecon.batchNumber}</strong> &bull; Location:{' '}
                      <strong className="text-foreground">{selectedLotForRecon.locationName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total In:</span>{' '}
                      <strong className="text-emerald-600">+{reconReport.totalIn}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Out:</span>{' '}
                      <strong className="text-rose-600">-{reconReport.totalOut}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Calculated:</span>{' '}
                      <strong className="text-foreground">{reconReport.calculatedBalance}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recorded Stock:</span>{' '}
                      <strong className="text-cyan-600">{reconReport.remainingQuantity}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Movements Table */}
              <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-[11px]">Movement Timestamp</TableHead>
                      <TableHead className="text-[11px]">Movement Type</TableHead>
                      <TableHead className="text-[11px] text-right">Quantity</TableHead>
                      <TableHead className="text-[11px] text-right">Unit Cost</TableHead>
                      <TableHead className="text-[11px] text-right">Total Impact</TableHead>
                      <TableHead className="text-[11px]">Reason / Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconReport.movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No movements recorded for this lot.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reconReport.movements.map((m) => {
                        const isPositive = m.movementType.endsWith('_IN')
                        return (
                          <TableRow key={m.id} className="text-xs">
                            <TableCell className="font-mono text-[11px]">
                              {new Date(m.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  m.movementType === 'PRODUCTION_IN'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : m.movementType === 'TRANSFER_IN'
                                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                    : m.movementType === 'TRANSFER_OUT'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : m.movementType.includes('DAMAGE') || m.movementType.includes('SPOILAGE')
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {m.movementType}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-bold ${
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[11px]">
                              {Number(m.unitCostSnapshot).toFixed(2)} ETB
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {Number(m.totalCost).toFixed(2)} ETB
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[11px]">
                              {m.reason || m.notes || '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Modal 1: Post Production Batch to Stock */}
      <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-600" />
              Post Production to Finished Stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Posts ONLY the accepted sellable units into finished goods inventory. Rejected units are permanently barred.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={postForm.handleSubmit(onSubmitPostProduction)} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-foreground">Completed Production Batch *</label>
              <select
                {...postForm.register('productionBatchId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {completedBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} ({b.recipeName ?? 'Batch'}) - Plan: {b.plannedQuantity} pcs
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Destination Stock Location *</label>
              <select
                {...postForm.register('stockLocationId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {locations
                  .filter((l) => l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.branchName ?? 'Branch'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Freshness Shelf-Life (Hours)</label>
              <Input
                type="number"
                {...postForm.register('expiryHours', { valueAsNumber: true })}
                placeholder="72"
                className="mt-1 text-xs"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Standard room-temperature injera shelf-life is 72 hours (3 days).
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
              <Input
                {...postForm.register('notes')}
                placeholder="Morning high-quality bake batch"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPostModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={postForm.formState.isSubmitting}
              >
                {postForm.formState.isSubmitting ? 'Posting...' : 'Post Accepted Units'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Finished Lot Adjustment & Damage Write-off */}
      <Dialog open={isAdjustLotModalOpen} onOpenChange={setIsAdjustLotModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Adjust Finished Goods / Spoilage
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record damage, spoilage, breakage during packaging, or physical count reconciliation.
            </DialogDescription>
          </DialogHeader>

          {selectedLotForAdjust && (
            <div className="rounded-md border border-border/80 bg-muted/40 p-2 text-xs mb-2">
              <div>
                <strong>Product:</strong> {selectedLotForAdjust.productName}
              </div>
              <div>
                <strong>Current Available Balance:</strong>{' '}
                <span className="font-bold text-foreground">{selectedLotForAdjust.remainingQuantity} pcs</span>
              </div>
            </div>
          )}

          <form onSubmit={adjustLotForm.handleSubmit(onSubmitAdjustLot)} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Movement Type *</label>
              <select
                {...adjustLotForm.register('movementType')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                <option value="DAMAGE_OUT">DAMAGE_OUT (Cracked / Broken Injera)</option>
                <option value="SPOILAGE_OUT">SPOILAGE_OUT (Expired / Mould / Stale)</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Physical Count Shortage)</option>
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Physical Count Surplus)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Quantity *</label>
              <Input
                type="number"
                {...adjustLotForm.register('quantity', { valueAsNumber: true })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Reason *</label>
              <Input
                {...adjustLotForm.register('reason')}
                placeholder="Handling damage or rack collapse"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
              <Input {...adjustLotForm.register('notes')} placeholder="Supervisor note" className="mt-1 text-xs" />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustLotModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                disabled={adjustLotForm.formState.isSubmitting}
              >
                {adjustLotForm.formState.isSubmitting ? 'Recording...' : 'Record Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Transfer Finished Stock */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-cyan-600" />
              Transfer Finished Stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Relocate sellable injera between locations (e.g. from cooling racks to dispatch staging).
            </DialogDescription>
          </DialogHeader>

          {selectedLotForTransfer && (
            <div className="rounded-md border border-border/80 bg-muted/40 p-2 text-xs mb-2">
              <div>
                <strong>From Location:</strong> {selectedLotForTransfer.locationName}
              </div>
              <div>
                <strong>Available to Transfer:</strong>{' '}
                <span className="font-bold text-foreground">{selectedLotForTransfer.remainingQuantity} pcs</span>
              </div>
            </div>
          )}

          <form onSubmit={transferForm.handleSubmit(onSubmitTransfer)} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Destination Stock Location *</label>
              <select
                {...transferForm.register('targetStockLocationId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {locations
                  .filter((l) => l.id !== selectedLotForTransfer?.stockLocationId && l.isActive)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.branchName ?? 'Branch'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Transfer Quantity *</label>
              <Input
                type="number"
                {...transferForm.register('quantity', { valueAsNumber: true })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Transfer Notes (Optional)</label>
              <Input
                {...transferForm.register('notes')}
                placeholder="Staging for afternoon retail orders"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={transferForm.formState.isSubmitting}
              >
                {transferForm.formState.isSubmitting ? 'Transferring...' : 'Execute Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Add Stock Location */}
      <Dialog open={isAddLocationModalOpen} onOpenChange={setIsAddLocationModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-cyan-600" />
              Add Stock Location
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a physical cooling rack, holding area, or dispatch zone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={locationForm.handleSubmit(onSubmitLocation)} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Branch *</label>
              <select
                {...locationForm.register('branchId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Location Name *</label>
              <Input
                {...locationForm.register('name')}
                placeholder="e.g. Ventilated Cooling Rack Bay 2"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Input
                {...locationForm.register('description')}
                placeholder="Stainless steel racks with extraction fans"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddLocationModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={locationForm.formState.isSubmitting}
              >
                {locationForm.formState.isSubmitting ? 'Saving...' : 'Save Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Raw Material Stock Adjustment */}
      <Dialog open={isRawAdjustModalOpen} onOpenChange={setIsRawAdjustModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-4 w-4 text-amber-600" />
              Adjust Raw Material Stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Write off grain spillage, humidity damage, or record physical inventory variance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={rawAdjustForm.handleSubmit(onSubmitRawAdjust)} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Select Material Lot *</label>
              <select
                {...rawAdjustForm.register('materialLotId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {rawMaterialLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.materialName ?? 'Material'} - Lot: {l.lotNumber} (Avail: {l.remainingQuantity} {l.unitSymbol ?? ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Adjustment Direction *</label>
              <select
                {...rawAdjustForm.register('movementType')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Write-off / Loss / Spillage)</option>
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Found Stock / Recount Surplus)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Quantity *</label>
              <Input
                type="number"
                step="0.01"
                {...rawAdjustForm.register('quantity', { valueAsNumber: true })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes / Reason</label>
              <Input
                {...rawAdjustForm.register('notes')}
                placeholder="Water leak damaged bag"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRawAdjustModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                disabled={rawAdjustForm.formState.isSubmitting}
              >
                {rawAdjustForm.formState.isSubmitting ? 'Adjusting...' : 'Save Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
