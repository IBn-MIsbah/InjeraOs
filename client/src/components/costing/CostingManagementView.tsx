import { useCallback, useEffect, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  costingApi,
  productionApi,
  branchesApi,
  workforceApi,
  type EmployeeCompensationEntity,
  type OverheadRecordEntity,
  type LabourCostRecordEntity,
  type BatchCostingDetail,
  type UnitCostTrendItem,
  type ProductionBatchEntity,
  type BranchEntity,
  type EmployeeEntity,
} from '@/lib/api'
import {
  createCompensationSchema,
  createOverheadRecordSchema,
  allocateOverheadSchema,
  createLabourCostRecordSchema,
  allocateLabourCostSchema,
  compensationTypeOptions,
  overheadCategoryOptions,
  overheadAllocationTypeOptions,
  paymentMethodOptions,
  type CreateCompensationInput,
  type CreateOverheadRecordInput,
  type AllocateOverheadInput,
  type CreateLabourCostRecordInput,
  type AllocateLabourCostInput,
} from '@/schemas/costing.schema'
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
  Coins,
  Calculator,
  Receipt,
  Users,
  TrendingUp,
  Lock,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Info,
} from 'lucide-react'

type SubTab = 'batch-costing' | 'overheads' | 'labour' | 'trends'

export function CostingManagementView() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('batch-costing')
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [employees, setEmployees] = useState<EmployeeEntity[]>([])
  const [batches, setBatches] = useState<ProductionBatchEntity[]>([])

  // Batch Costing SubTab State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [batchCostingDetail, setBatchCostingDetail] = useState<BatchCostingDetail | null>(null)
  const [isLoadingBatchCosting, setIsLoadingBatchCosting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [costingError, setCostingError] = useState<string | null>(null)
  const [costingSuccess, setCostingSuccess] = useState<string | null>(null)

  // Overheads SubTab State
  const [overheads, setOverheads] = useState<OverheadRecordEntity[]>([])
  const [isLoadingOverheads, setIsLoadingOverheads] = useState(false)
  const [isOverheadModalOpen, setIsOverheadModalOpen] = useState(false)
  const [overheadToAllocate, setOverheadToAllocate] = useState<OverheadRecordEntity | null>(null)
  const [overheadError, setOverheadError] = useState<string | null>(null)
  const [overheadSuccess, setOverheadSuccess] = useState<string | null>(null)

  // Labour SubTab State
  const [compensations, setCompensations] = useState<EmployeeCompensationEntity[]>([])
  const [labourCosts, setLabourCosts] = useState<LabourCostRecordEntity[]>([])
  const [isLoadingLabour, setIsLoadingLabour] = useState(false)
  const [isCompensationModalOpen, setIsCompensationModalOpen] = useState(false)
  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false)
  const [labourToAllocate, setLabourToAllocate] = useState<LabourCostRecordEntity | null>(null)
  const [labourError, setLabourError] = useState<string | null>(null)
  const [labourSuccess, setLabourSuccess] = useState<string | null>(null)

  // Trends SubTab State
  const [trends, setTrends] = useState<UnitCostTrendItem[]>([])
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)

  // Initial load effect
  useEffect(() => {
    let ignore = false
    void Promise.all([
      branchesApi.getBranches(),
      workforceApi.getEmployees(),
      productionApi.getBatches(),
    ])
      .then(([branchRes, empRes, batchRes]) => {
        if (ignore) return
        setBranches(branchRes)
        setEmployees(empRes)
        setBatches(batchRes)
        if (batchRes.length > 0) {
          setSelectedBatchId(batchRes[0].id)
        }
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load foundational data:', err)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Load Selected Batch Costing Detail
  const loadBatchCosting = useCallback(async (batchId: string) => {
    if (!batchId) return
    setIsLoadingBatchCosting(true)
    setCostingError(null)
    try {
      const detail = await costingApi.getBatchCosting(batchId)
      setBatchCostingDetail(detail)
    } catch (err: unknown) {
      console.error('Failed to load batch costing:', err)
      if (axios.isAxiosError(err)) {
        setCostingError(err.response?.data?.message ?? 'Failed to load batch costing.')
      } else {
        setCostingError('Failed to load batch costing.')
      }
    } finally {
      setIsLoadingBatchCosting(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedBatchId || activeSubTab !== 'batch-costing') return
    let ignore = false
    void costingApi
      .getBatchCosting(selectedBatchId)
      .then((detail) => {
        if (ignore) return
        setBatchCostingDetail(detail)
        setCostingError(null)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load batch costing:', err)
        if (axios.isAxiosError(err)) {
          setCostingError(err.response?.data?.message ?? 'Failed to load batch costing.')
        } else {
          setCostingError('Failed to load batch costing.')
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedBatchId, activeSubTab])

  // Calculate Batch Cost
  const handleCalculateBatchCost = async () => {
    if (!selectedBatchId) return
    setIsCalculating(true)
    setCostingError(null)
    setCostingSuccess(null)
    try {
      const res = await costingApi.calculateBatchCost(selectedBatchId)
      setCostingSuccess(res.message)
      await loadBatchCosting(selectedBatchId)
    } catch (err: unknown) {
      console.error('Failed to calculate batch cost:', err)
      if (axios.isAxiosError(err)) {
        setCostingError(err.response?.data?.message ?? 'Calculation failed.')
      } else {
        setCostingError('Calculation failed.')
      }
    } finally {
      setIsCalculating(false)
    }
  }

  // Finalize Batch Cost
  const handleFinalizeBatchCost = async () => {
    if (!selectedBatchId) return
    setIsFinalizing(true)
    setCostingError(null)
    setCostingSuccess(null)
    try {
      const res = await costingApi.finalizeBatchCost(selectedBatchId)
      setCostingSuccess(res.message)
      await loadBatchCosting(selectedBatchId)
    } catch (err: unknown) {
      console.error('Failed to finalize batch cost:', err)
      if (axios.isAxiosError(err)) {
        setCostingError(err.response?.data?.message ?? 'Finalization failed.')
      } else {
        setCostingError('Finalization failed.')
      }
    } finally {
      setIsFinalizing(false)
    }
  }

  // Load Overheads
  const loadOverheads = useCallback(async () => {
    setIsLoadingOverheads(true)
    setOverheadError(null)
    try {
      const data = await costingApi.getOverheads()
      setOverheads(data)
    } catch (err: unknown) {
      console.error('Failed to load overheads:', err)
      if (axios.isAxiosError(err)) {
        setOverheadError(err.response?.data?.message ?? 'Failed to load overheads.')
      }
    } finally {
      setIsLoadingOverheads(false)
    }
  }, [])

  useEffect(() => {
    if (activeSubTab !== 'overheads') return
    let ignore = false
    void costingApi
      .getOverheads()
      .then((data) => {
        if (ignore) return
        setOverheads(data)
        setOverheadError(null)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load overheads:', err)
        if (axios.isAxiosError(err)) {
          setOverheadError(err.response?.data?.message ?? 'Failed to load overheads.')
        }
      })

    return () => {
      ignore = true
    }
  }, [activeSubTab])

  // Load Labour Data
  const loadLabour = useCallback(async () => {
    setIsLoadingLabour(true)
    setLabourError(null)
    try {
      const [compRes, labourRes] = await Promise.all([
        costingApi.getCompensations(),
        costingApi.getLabourCosts(),
      ])
      setCompensations(compRes)
      setLabourCosts(labourRes)
    } catch (err: unknown) {
      console.error('Failed to load labour records:', err)
      if (axios.isAxiosError(err)) {
        setLabourError(err.response?.data?.message ?? 'Failed to load labour records.')
      }
    } finally {
      setIsLoadingLabour(false)
    }
  }, [])

  useEffect(() => {
    if (activeSubTab !== 'labour') return
    let ignore = false
    void Promise.all([costingApi.getCompensations(), costingApi.getLabourCosts()])
      .then(([compRes, labourRes]) => {
        if (ignore) return
        setCompensations(compRes)
        setLabourCosts(labourRes)
        setLabourError(null)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load labour records:', err)
        if (axios.isAxiosError(err)) {
          setLabourError(err.response?.data?.message ?? 'Failed to load labour records.')
        }
      })

    return () => {
      ignore = true
    }
  }, [activeSubTab])

  // Load Trends
  const loadTrends = useCallback(async () => {
    setIsLoadingTrends(true)
    try {
      const data = await costingApi.getUnitCostTrends()
      setTrends(data)
    } catch (err: unknown) {
      console.error('Failed to load trends:', err)
    } finally {
      setIsLoadingTrends(false)
    }
  }, [])

  useEffect(() => {
    if (activeSubTab !== 'trends') return
    let ignore = false
    void costingApi
      .getUnitCostTrends()
      .then((data) => {
        if (ignore) return
        setTrends(data)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load trends:', err)
      })

    return () => {
      ignore = true
    }
  }, [activeSubTab])

  // ==========================================
  // Form 1: Record Overhead Form
  // ==========================================
  const overheadForm = useForm<CreateOverheadRecordInput>({
    resolver: zodResolver(createOverheadRecordSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? '',
      allocationType: 'DAILY_SHARED',
      category: 'ELECTRICITY',
      amount: 100,
      operationalDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH',
      description: '',
      sourceReference: '',
      productionBatchId: '',
    },
  })

  const watchOverheadAllocationType = useWatch({
    control: overheadForm.control,
    name: 'allocationType',
  })

  const onOverheadSubmit = async (values: CreateOverheadRecordInput) => {
    setOverheadError(null)
    setOverheadSuccess(null)
    try {
      await costingApi.createOverhead({
        ...values,
        productionBatchId:
          values.allocationType === 'DIRECT_BATCH' ? values.productionBatchId : null,
      })
      setOverheadSuccess('Overhead record added successfully.')
      setIsOverheadModalOpen(false)
      overheadForm.reset()
      await loadOverheads()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOverheadError(err.response?.data?.message ?? 'Failed to save overhead.')
      } else {
        setOverheadError('Failed to save overhead.')
      }
    }
  }

  // ==========================================
  // Form 2: Allocate Shared Overhead Form
  // ==========================================
  const allocateOverheadForm = useForm<AllocateOverheadInput>({
    resolver: zodResolver(allocateOverheadSchema),
    defaultValues: {
      allocations: [{ productionBatchId: '', allocatedAmount: 0, allocationBasis: 'PROPORTIONAL_VOLUME' }],
    },
  })

  const {
    fields: overheadAllocFields,
    append: appendOverheadAlloc,
    remove: removeOverheadAlloc,
  } = useFieldArray({
    control: allocateOverheadForm.control,
    name: 'allocations',
  })

  const onAllocateOverheadSubmit = async (values: AllocateOverheadInput) => {
    if (!overheadToAllocate) return
    setOverheadError(null)
    setOverheadSuccess(null)
    try {
      const res = await costingApi.allocateOverhead(overheadToAllocate.id, values)
      setOverheadSuccess(res.message)
      setOverheadToAllocate(null)
      allocateOverheadForm.reset()
      await loadOverheads()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setOverheadError(err.response?.data?.message ?? 'Failed to allocate overhead.')
      } else {
        setOverheadError('Failed to allocate overhead.')
      }
    }
  }

  // ==========================================
  // Form 3: Employee Compensation Form
  // ==========================================
  const compForm = useForm<CreateCompensationInput>({
    resolver: zodResolver(createCompensationSchema),
    defaultValues: {
      employeeId: employees[0]?.id ?? '',
      compensationType: 'HOURLY',
      baseRate: 50,
      pieceRatePerInjera: 0,
      effectiveFrom: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const watchCompType = useWatch({
    control: compForm.control,
    name: 'compensationType',
  })

  const onCompSubmit = async (values: CreateCompensationInput) => {
    setLabourError(null)
    setLabourSuccess(null)
    try {
      await costingApi.createCompensation(values)
      setLabourSuccess('Employee wage compensation rate updated.')
      setIsCompensationModalOpen(false)
      compForm.reset()
      await loadLabour()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setLabourError(err.response?.data?.message ?? 'Failed to set compensation.')
      } else {
        setLabourError('Failed to set compensation.')
      }
    }
  }

  // ==========================================
  // Form 4: Daily Labour Cost Record Form
  // ==========================================
  const labourForm = useForm<CreateLabourCostRecordInput>({
    resolver: zodResolver(createLabourCostRecordSchema),
    defaultValues: {
      branchId: branches[0]?.id ?? '',
      employeeId: employees[0]?.id ?? '',
      operationalDate: new Date().toISOString().split('T')[0],
      workedMinutes: 480,
      compensationTypeSnapshot: 'HOURLY',
      rateSnapshot: 50,
      totalLabourCost: 400,
    },
  })

  const onLabourSubmit = async (values: CreateLabourCostRecordInput) => {
    setLabourError(null)
    setLabourSuccess(null)
    try {
      await costingApi.createLabourCost(values)
      setLabourSuccess('Daily labour cost record created.')
      setIsLabourModalOpen(false)
      labourForm.reset()
      await loadLabour()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setLabourError(err.response?.data?.message ?? 'Failed to create labour record.')
      } else {
        setLabourError('Failed to create labour record.')
      }
    }
  }

  // ==========================================
  // Form 5: Allocate Labour Cost to Batches Form
  // ==========================================
  const allocateLabourForm = useForm<AllocateLabourCostInput>({
    resolver: zodResolver(allocateLabourCostSchema),
    defaultValues: {
      allocations: [{ productionBatchId: '', allocatedCost: 0, allocationBasis: 'HOURS_WORKED' }],
    },
  })

  const {
    fields: labourAllocFields,
    append: appendLabourAlloc,
    remove: removeLabourAlloc,
  } = useFieldArray({
    control: allocateLabourForm.control,
    name: 'allocations',
  })

  const onAllocateLabourSubmit = async (values: AllocateLabourCostInput) => {
    if (!labourToAllocate) return
    setLabourError(null)
    setLabourSuccess(null)
    try {
      const res = await costingApi.allocateLabourCost(labourToAllocate.id, values)
      setLabourSuccess(res.message)
      setLabourToAllocate(null)
      allocateLabourForm.reset()
      await loadLabour()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setLabourError(err.response?.data?.message ?? 'Failed to allocate labour cost.')
      } else {
        setLabourError('Failed to allocate labour cost.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="h-6 w-6 text-emerald-600" />
            Production Costing & Unit Absorption
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-component batch absorption costing, daily overhead allocations, workforce wage tracking, and accepted-unit scrap absorption.
          </p>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
          <Button
            variant={activeSubTab === 'batch-costing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubTab('batch-costing')}
            className="text-xs gap-1.5"
          >
            <Calculator className="h-3.5 w-3.5" />
            Batch Costing & Absorption
          </Button>
          <Button
            variant={activeSubTab === 'overheads' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubTab('overheads')}
            className="text-xs gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5" />
            Overhead Expenses
          </Button>
          <Button
            variant={activeSubTab === 'labour' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubTab('labour')}
            className="text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            Labour Cost & Wages
          </Button>
          <Button
            variant={activeSubTab === 'trends' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubTab('trends')}
            className="text-xs gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Unit Cost Trends
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: Batch Costing & Accepted-Unit Absorption                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'batch-costing' && (
        <div className="space-y-6">
          {/* Batch Selector & Actions Bar */}
          <Card className="border border-border/80 shadow-xs">
            <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                  Select Production Batch:
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} - {b.recipeName ?? 'Standard Recipe'} ({b.status})
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBatchCosting(selectedBatchId)}
                  disabled={isLoadingBatchCosting}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBatchCosting ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCalculateBatchCost}
                  disabled={isCalculating || batchCostingDetail?.costSummary.isFinalized}
                  className="text-xs gap-1.5"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {isCalculating ? 'Calculating…' : 'Recalculate Cost'}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFinalizeBatchCost}
                  disabled={
                    isFinalizing ||
                    batchCostingDetail?.costSummary.isFinalized ||
                    !batchCostingDetail?.costSummary.calculationVersion
                  }
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {isFinalizing
                    ? 'Locking…'
                    : batchCostingDetail?.costSummary.isFinalized
                    ? 'Costing Finalized & Locked'
                    : 'Finalize & Lock Snapshot'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback messages */}
          {costingError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{costingError}</span>
            </div>
          )}

          {costingSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{costingSuccess}</span>
            </div>
          )}

          {/* Domain Invariant Banner */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-semibold">Accepted-Unit Cost Absorption Invariant:</span> Total Batch Cost is
              calculated as Material Cost + Direct Overhead + Allocated Daily Overhead + Allocated Labour. The cost per
              sellable injera is divided <span className="font-semibold underline">only by accepted units</span>.
              Damaged/burnt injera cost is absorbed 100% into sellable unit cost rather than being written off as
              phantom output.
            </div>
          </div>

          {batchCostingDetail ? (
            <div className="space-y-6">
              {/* Cost Summary Metric Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="border border-border/80">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Raw Materials</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-lg font-bold text-foreground">
                      ETB {batchCostingDetail.costSummary.rawMaterialCost.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">FIFO lot inventory</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Direct Overhead</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-lg font-bold text-foreground">
                      ETB {batchCostingDetail.costSummary.directOverheadCost.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Specific batch expenses</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Shared Overhead</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-lg font-bold text-foreground">
                      ETB {batchCostingDetail.costSummary.allocatedOverheadCost.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Power, water, firewood</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Allocated Labour</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-lg font-bold text-foreground">
                      ETB {batchCostingDetail.costSummary.allocatedLabourCost.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Baker wages & shifts</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/20">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Total Batch Cost</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-lg font-bold text-foreground">
                      ETB {batchCostingDetail.costSummary.totalBatchCost.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {batchCostingDetail.costSummary.acceptedQuantity} accepted /{' '}
                      {batchCostingDetail.batch.rejectedQuantity} rejected
                    </span>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-500/40 bg-emerald-500/5">
                  <CardHeader className="p-3 pb-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
                      Cost Per Sellable Injera
                    </span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      ETB {batchCostingDetail.costSummary.costPerAcceptedUnit.toFixed(2)}
                    </div>
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      Absorbed sellable unit cost
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Status and Version Badge Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  {batchCostingDetail.costSummary.isFinalized ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Lock className="h-3 w-3" /> Finalized & Locked (Snapshot)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Draft / In Review (Unlocked)
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-3">
                    Calculation Version:{' '}
                    <strong className="text-foreground">
                      {batchCostingDetail.costSummary.calculationVersion || 'None'}
                    </strong>
                  </span>
                </div>

                {batchCostingDetail.costSummary.finalizedAt && (
                  <span className="text-xs text-muted-foreground">
                    Locked At: {new Date(batchCostingDetail.costSummary.finalizedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Costing Breakdowns: Raw Materials, Overheads, and Labour */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* 1. Raw Materials Consumed */}
                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>1. Materials Consumed (FIFO)</span>
                      <span className="text-xs font-bold text-foreground">
                        ETB {batchCostingDetail.costSummary.rawMaterialCost.toFixed(2)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {batchCostingDetail.breakdown.materials.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground text-center">
                        No material lots consumed recorded.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px]">Material / Lot</TableHead>
                            <TableHead className="text-[11px] text-right">Qty</TableHead>
                            <TableHead className="text-[11px] text-right">Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchCostingDetail.breakdown.materials.map((m, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium">
                                <div>{m.materialName}</div>
                                <div className="text-[10px] text-muted-foreground">{m.lotNumber}</div>
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {m.quantityUsed.toFixed(1)} @ ETB {m.unitPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold">
                                ETB {m.materialCost.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Overhead Allocations */}
                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>2. Overhead Expenses</span>
                      <span className="text-xs font-bold text-foreground">
                        ETB{' '}
                        {(
                          batchCostingDetail.costSummary.directOverheadCost +
                          batchCostingDetail.costSummary.allocatedOverheadCost
                        ).toFixed(2)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Direct Overheads */}
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                        Direct Batch Overheads (ETB {batchCostingDetail.costSummary.directOverheadCost.toFixed(2)})
                      </div>
                      {batchCostingDetail.breakdown.directOverheads.length === 0 ? (
                        <div className="text-xs text-muted-foreground">None</div>
                      ) : (
                        <div className="space-y-1">
                          {batchCostingDetail.breakdown.directOverheads.map((d) => (
                            <div key={d.id} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span>{d.category}</span>
                              <span className="font-semibold">ETB {d.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shared Overheads */}
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                        Allocated Shared Overheads (ETB{' '}
                        {batchCostingDetail.costSummary.allocatedOverheadCost.toFixed(2)})
                      </div>
                      {batchCostingDetail.breakdown.allocatedOverheads.length === 0 ? (
                        <div className="text-xs text-muted-foreground">None allocated</div>
                      ) : (
                        <div className="space-y-1">
                          {batchCostingDetail.breakdown.allocatedOverheads.map((a) => (
                            <div key={a.id} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span>
                                {a.category} ({a.allocationBasis})
                              </span>
                              <span className="font-semibold">ETB {a.allocatedAmount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Labour Allocations */}
                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>3. Allocated Labour</span>
                      <span className="text-xs font-bold text-foreground">
                        ETB {batchCostingDetail.costSummary.allocatedLabourCost.toFixed(2)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {batchCostingDetail.breakdown.allocatedLabour.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground text-center">
                        No labour cost records allocated to this batch.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px]">Worker</TableHead>
                            <TableHead className="text-[11px]">Wage Type</TableHead>
                            <TableHead className="text-[11px] text-right">Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchCostingDetail.breakdown.allocatedLabour.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs font-medium">{l.employeeName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{l.compensationType}</TableCell>
                              <TableCell className="text-xs text-right font-semibold">
                                ETB {l.allocatedCost.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Historical Calculation Versions */}
              {batchCostingDetail.history.length > 0 && (
                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Cost Calculation History & Versioned Snapshots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px]">Version</TableHead>
                          <TableHead className="text-[11px]">Materials</TableHead>
                          <TableHead className="text-[11px]">Direct OH</TableHead>
                          <TableHead className="text-[11px]">Allocated OH</TableHead>
                          <TableHead className="text-[11px]">Labour</TableHead>
                          <TableHead className="text-[11px]">Total Cost</TableHead>
                          <TableHead className="text-[11px]">Accepted Injera</TableHead>
                          <TableHead className="text-[11px]">Cost / Injera</TableHead>
                          <TableHead className="text-[11px]">Calculated At</TableHead>
                          <TableHead className="text-[11px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchCostingDetail.history.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs font-bold">v{h.calculationVersion}</TableCell>
                            <TableCell className="text-xs">ETB {h.rawMaterialCost.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">ETB {h.directOverheadCost.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">ETB {h.allocatedOverheadCost.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">ETB {h.allocatedLabourCost.toFixed(2)}</TableCell>
                            <TableCell className="text-xs font-semibold">ETB {h.totalBatchCost.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">{h.acceptedQuantity}</TableCell>
                            <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ETB {h.costPerAcceptedUnit.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(h.calculatedAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {h.finalizedAt ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                  <Lock className="h-3 w-3" /> Finalized
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Draft</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <h3 className="text-sm font-semibold text-foreground">No Batch Costing Record</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Select a batch above and click &quot;Recalculate Cost&quot; to compute material, overhead, and labour absorption.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: Overhead Expenses & Shared Allocation                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'overheads' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Overhead Expense Log</h2>
              <p className="text-xs text-muted-foreground">
                Track direct expenses per batch and shared utility expenses (electricity, water, fuel, firewood).
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsOverheadModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Overhead Expense
            </Button>
          </div>

          {overheadError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{overheadError}</span>
            </div>
          )}

          {overheadSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{overheadSuccess}</span>
            </div>
          )}

          <Card className="border border-border/80">
            <CardContent className="p-0">
              {isLoadingOverheads ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading overhead records…</div>
              ) : overheads.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No overhead expense records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Date</TableHead>
                      <TableHead className="text-[11px]">Category</TableHead>
                      <TableHead className="text-[11px]">Type</TableHead>
                      <TableHead className="text-[11px]">Batch Target</TableHead>
                      <TableHead className="text-[11px] text-right">Amount</TableHead>
                      <TableHead className="text-[11px] text-right">Allocated</TableHead>
                      <TableHead className="text-[11px] text-right">Remaining</TableHead>
                      <TableHead className="text-[11px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overheads.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs font-medium">
                          {new Date(o.operationalDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold">{o.category}</span>
                          {o.description && (
                            <div className="text-[10px] text-muted-foreground">{o.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              o.allocationType === 'DIRECT_BATCH'
                                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                            }`}
                          >
                            {o.allocationType === 'DIRECT_BATCH' ? 'Direct Batch' : 'Daily Shared'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.batchNumber ? (
                            <span className="font-semibold text-foreground">{o.batchNumber}</span>
                          ) : (
                            'Shared'
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold">
                          ETB {o.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          ETB {(o.allocatedAmount ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-amber-600">
                          ETB {(o.remainingUnallocated ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {o.allocationType === 'DAILY_SHARED' && (o.remainingUnallocated ?? 0) > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOverheadToAllocate(o)
                                allocateOverheadForm.reset({
                                  allocations: [
                                    {
                                      productionBatchId: batches[0]?.id ?? '',
                                      allocatedAmount: o.remainingUnallocated ?? 0,
                                      allocationBasis: 'PROPORTIONAL_VOLUME',
                                    },
                                  ],
                                })
                              }}
                              className="text-[11px] h-7 gap-1"
                            >
                              <PieChart className="h-3 w-3" />
                              Allocate
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Locked / Allocated</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: Labour Cost & Wages                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'labour' && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workforce Labour Costing</h2>
              <p className="text-xs text-muted-foreground">
                Set employee wage structures (Hourly, Piece-rate, Salary) and allocate daily shift labour costs into batches.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompensationModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Configure Wage Rate
              </Button>
              <Button
                size="sm"
                onClick={() => setIsLabourModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Daily Labour Cost
              </Button>
            </div>
          </div>

          {labourError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{labourError}</span>
            </div>
          )}

          {labourSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{labourSuccess}</span>
            </div>
          )}

          {/* Section 1: Active Employee Wage Configurations */}
          <Card className="border border-border/80">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Employee Wage & Compensation Rates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLabour ? (
                <div className="p-4 text-xs text-muted-foreground text-center">Loading compensation rates…</div>
              ) : compensations.length === 0 ? (
                <div className="p-6 text-xs text-muted-foreground text-center">
                  No employee compensation rates configured.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Employee</TableHead>
                      <TableHead className="text-[11px]">Compensation Type</TableHead>
                      <TableHead className="text-[11px]">Base Rate (ETB)</TableHead>
                      <TableHead className="text-[11px]">Piece Rate (ETB/Injera)</TableHead>
                      <TableHead className="text-[11px]">Effective From</TableHead>
                      <TableHead className="text-[11px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compensations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-semibold">
                          {c.employeeName}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {c.employeeNumber}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {c.compensationType}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-bold">ETB {c.baseRate.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          {c.pieceRatePerInjera ? `ETB ${c.pieceRatePerInjera.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.effectiveFrom).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Daily Labour Cost Records */}
          <Card className="border border-border/80">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Daily Labour Records & Batch Allocations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {labourCosts.length === 0 ? (
                <div className="p-6 text-xs text-muted-foreground text-center">
                  No daily labour cost records recorded yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Date</TableHead>
                      <TableHead className="text-[11px]">Employee</TableHead>
                      <TableHead className="text-[11px]">Duration</TableHead>
                      <TableHead className="text-[11px]">Rate Snapshot</TableHead>
                      <TableHead className="text-[11px] text-right">Labour Cost</TableHead>
                      <TableHead className="text-[11px] text-right">Remaining</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labourCosts.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-medium">
                          {new Date(l.operationalDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{l.employeeName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(l.workedMinutes / 60).toFixed(1)} hrs ({l.workedMinutes}m)
                        </TableCell>
                        <TableCell className="text-xs">
                          {l.compensationTypeSnapshot}: ETB {l.rateSnapshot.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold">
                          ETB {l.totalLabourCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-amber-600">
                          ETB {(l.remainingUnallocated ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              l.status === 'FINALIZED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : l.status === 'ALLOCATED'
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {l.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {l.status !== 'FINALIZED' && (l.remainingUnallocated ?? 0) > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLabourToAllocate(l)
                                allocateLabourForm.reset({
                                  allocations: [
                                    {
                                      productionBatchId: batches[0]?.id ?? '',
                                      allocatedCost: l.remainingUnallocated ?? 0,
                                      allocationBasis: 'HOURS_WORKED',
                                    },
                                  ],
                                })
                              }}
                              className="text-[11px] h-7 gap-1"
                            >
                              <PieChart className="h-3 w-3" />
                              Allocate
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Locked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: Unit Cost Trends & Analysis                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'trends' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Unit Cost Trends & Scrap Absorption</h2>
              <p className="text-xs text-muted-foreground">
                Historical unit cost per accepted injera across finalized batches, illustrating scrap absorption impact.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTrends}
              disabled={isLoadingTrends}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingTrends ? 'animate-spin' : ''}`} />
              Refresh Trends
            </Button>
          </div>

          {trends.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No finalized batch costing records found. Finalize batch calculations in Sub-tab 1 to populate trends.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Trend Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-1">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Average Unit Cost</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-foreground">
                      ETB{' '}
                      {(
                        trends.reduce((acc, t) => acc + t.costPerAcceptedUnit, 0) / (trends.length || 1)
                      ).toFixed(2)}
                    </div>
                    <span className="text-xs text-muted-foreground">Per accepted sellable injera</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-1">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Average Scrap Rate</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-amber-600">
                      {(
                        trends.reduce((acc, t) => acc + t.rejectionRatePercent, 0) / (trends.length || 1)
                      ).toFixed(1)}
                      %
                    </div>
                    <span className="text-xs text-muted-foreground">Defective / burnt injera rate</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80">
                  <CardHeader className="p-4 pb-1">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Finalized Batches</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-emerald-600">{trends.length}</div>
                    <span className="text-xs text-muted-foreground">Audited immutable snapshots</span>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Details Table */}
              <Card className="border border-border/80">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                  <CardTitle className="text-sm font-semibold">Finalized Batch Cost Register</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">Batch #</TableHead>
                        <TableHead className="text-[11px]">Recipe</TableHead>
                        <TableHead className="text-[11px] text-right">Accepted Qty</TableHead>
                        <TableHead className="text-[11px] text-right">Rejection %</TableHead>
                        <TableHead className="text-[11px] text-right">Total Cost (ETB)</TableHead>
                        <TableHead className="text-[11px] text-right">Unit Cost (ETB)</TableHead>
                        <TableHead className="text-[11px] text-right">Zero-Scrap Baseline</TableHead>
                        <TableHead className="text-[11px] text-right">Scrap Impact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trends.map((t) => {
                        const totalUnits = t.acceptedQuantity + t.rejectedQuantity
                        const zeroScrapCost = totalUnits > 0 ? t.totalBatchCost / totalUnits : 0
                        const scrapPenalty = t.costPerAcceptedUnit - zeroScrapCost
                        return (
                          <TableRow key={t.batchId}>
                            <TableCell className="text-xs font-bold">{t.batchNumber}</TableCell>
                            <TableCell className="text-xs">{t.recipeName}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{t.acceptedQuantity}</TableCell>
                            <TableCell className="text-xs text-right">
                              <span
                                className={`font-semibold ${
                                  t.rejectionRatePercent > 5 ? 'text-amber-600' : 'text-muted-foreground'
                                }`}
                              >
                                {t.rejectionRatePercent.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold">
                              ETB {t.totalBatchCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-600 dark:text-emerald-400">
                              ETB {t.costPerAcceptedUnit.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">
                              ETB {zeroScrapCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-rose-600">
                              +ETB {scrapPenalty.toFixed(2)} / unit
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: Record Overhead Expense Modal                                   */}
      {/* ========================================================================= */}
      <Dialog open={isOverheadModalOpen} onOpenChange={setIsOverheadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Overhead Expense</DialogTitle>
            <DialogDescription>
              Record an operating overhead (direct batch specific or daily shared utility).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={overheadForm.handleSubmit(onOverheadSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Branch</label>
                <select
                  {...overheadForm.register('branchId')}
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
                <label className="text-xs font-medium text-foreground">Date</label>
                <Input
                  type="date"
                  {...overheadForm.register('operationalDate')}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Category</label>
                <select
                  {...overheadForm.register('category')}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  {overheadCategoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Amount (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...overheadForm.register('amount', { valueAsNumber: true })}
                  className="mt-1 h-8 text-xs"
                />
                {overheadForm.formState.errors.amount && (
                  <span className="text-[10px] text-destructive">
                    {overheadForm.formState.errors.amount.message}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Allocation Method</label>
              <select
                {...overheadForm.register('allocationType')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {overheadAllocationTypeOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {watchOverheadAllocationType === 'DIRECT_BATCH' && (
              <div>
                <label className="text-xs font-medium text-foreground">Assign to Batch</label>
                <select
                  {...overheadForm.register('productionBatchId')}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  <option value="">Select a batch…</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} - {b.recipeName ?? 'Standard'}
                    </option>
                  ))}
                </select>
                {overheadForm.formState.errors.productionBatchId && (
                  <span className="text-[10px] text-destructive">
                    {overheadForm.formState.errors.productionBatchId.message}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Payment Method</label>
                <select
                  {...overheadForm.register('paymentMethod')}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  {paymentMethodOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Reference / Bill #</label>
                <Input
                  {...overheadForm.register('sourceReference')}
                  placeholder="e.g. ELEC-9923"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Description / Notes</label>
              <Input
                {...overheadForm.register('description')}
                placeholder="Details of expense…"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOverheadModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save Overhead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: Allocate Shared Overhead Modal                                  */}
      {/* ========================================================================= */}
      <Dialog open={!!overheadToAllocate} onOpenChange={(open) => !open && setOverheadToAllocate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Shared Overhead to Batches</DialogTitle>
            <DialogDescription>
              Allocate {overheadToAllocate?.category} (ETB {overheadToAllocate?.amount.toFixed(2)}) across production
              batches. Remaining unallocated: ETB {overheadToAllocate?.remainingUnallocated?.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={allocateOverheadForm.handleSubmit(onAllocateOverheadSubmit)} className="space-y-4">
            <div className="space-y-3">
              {overheadAllocFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2 border p-2 rounded-md">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Batch</label>
                    <select
                      {...allocateOverheadForm.register(`allocations.${idx}.productionBatchId`)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber} - {b.recipeName ?? 'Standard'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="text-[10px] text-muted-foreground uppercase">Amount (ETB)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...allocateOverheadForm.register(`allocations.${idx}.allocatedAmount`, {
                        valueAsNumber: true,
                      })}
                      className="h-8 text-xs"
                    />
                  </div>

                  {overheadAllocFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOverheadAlloc(idx)}
                      className="text-rose-500 mt-3 h-8 px-2"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendOverheadAlloc({
                    productionBatchId: batches[0]?.id ?? '',
                    allocatedAmount: 0,
                    allocationBasis: 'PROPORTIONAL_VOLUME',
                  })
                }
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add Batch Allocation
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOverheadToAllocate(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Confirm Allocation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: Configure Wage Compensation Modal                               */}
      {/* ========================================================================= */}
      <Dialog open={isCompensationModalOpen} onOpenChange={setIsCompensationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Employee Wage Rate</DialogTitle>
            <DialogDescription>
              Set or update compensation structure for an employee (Hourly, Salary, or Piece-rate).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={compForm.handleSubmit(onCompSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Employee</label>
              <select
                {...compForm.register('employeeId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Compensation Type</label>
              <select
                {...compForm.register('compensationType')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {compensationTypeOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Base Rate (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...compForm.register('baseRate', { valueAsNumber: true })}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {watchCompType === 'PIECE_RATE' && (
                <div>
                  <label className="text-xs font-medium text-foreground">Piece Rate (ETB/Injera)</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...compForm.register('pieceRatePerInjera', { valueAsNumber: true })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Effective From Date</label>
              <Input
                type="date"
                {...compForm.register('effectiveFrom')}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <Input
                {...compForm.register('notes')}
                placeholder="Rate agreement notes…"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCompensationModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save Wage Rate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 4: Record Daily Labour Cost Modal                                  */}
      {/* ========================================================================= */}
      <Dialog open={isLabourModalOpen} onOpenChange={setIsLabourModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Daily Labour Cost</DialogTitle>
            <DialogDescription>
              Record workforce shift labour duration and compute daily cost with rate snapshot.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={labourForm.handleSubmit(onLabourSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Branch</label>
                <select
                  {...labourForm.register('branchId')}
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
                <label className="text-xs font-medium text-foreground">Date</label>
                <Input
                  type="date"
                  {...labourForm.register('operationalDate')}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Employee</label>
              <select
                {...labourForm.register('employeeId')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Worked Minutes</label>
                <Input
                  type="number"
                  {...labourForm.register('workedMinutes', { valueAsNumber: true })}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Wage Type</label>
                <select
                  {...labourForm.register('compensationTypeSnapshot')}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  {compensationTypeOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Rate Snapshot (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...labourForm.register('rateSnapshot', { valueAsNumber: true })}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Total Labour Cost (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...labourForm.register('totalLabourCost', { valueAsNumber: true })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLabourModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save Labour Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 5: Allocate Labour Cost to Batches Modal                           */}
      {/* ========================================================================= */}
      <Dialog open={!!labourToAllocate} onOpenChange={(open) => !open && setLabourToAllocate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate Labour Cost to Batches</DialogTitle>
            <DialogDescription>
              Allocate {labourToAllocate?.employeeName}&apos;s labour (ETB {labourToAllocate?.totalLabourCost.toFixed(2)})
              across production batches. Remaining unallocated: ETB {labourToAllocate?.remainingUnallocated?.toFixed(2)}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={allocateLabourForm.handleSubmit(onAllocateLabourSubmit)} className="space-y-4">
            <div className="space-y-3">
              {labourAllocFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2 border p-2 rounded-md">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Batch</label>
                    <select
                      {...allocateLabourForm.register(`allocations.${idx}.productionBatchId`)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber} - {b.recipeName ?? 'Standard'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="text-[10px] text-muted-foreground uppercase">Cost (ETB)</label>
                    <Input
                      type="number"
                      step="0.01"
                      {...allocateLabourForm.register(`allocations.${idx}.allocatedCost`, {
                        valueAsNumber: true,
                      })}
                      className="h-8 text-xs"
                    />
                  </div>

                  {labourAllocFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLabourAlloc(idx)}
                      className="text-rose-500 mt-3 h-8 px-2"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendLabourAlloc({
                    productionBatchId: batches[0]?.id ?? '',
                    allocatedCost: 0,
                    allocationBasis: 'HOURS_WORKED',
                  })
                }
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add Batch Allocation
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLabourToAllocate(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Confirm Labour Allocation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
