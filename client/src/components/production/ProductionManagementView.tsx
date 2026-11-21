import { useCallback, useEffect, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  productionApi,
  recipesApi,
  materialsApi,
  branchesApi,
  workforceApi,
  type ProductionSessionEntity,
  type ProductionBatchEntity,
  type BakerProductivitySummary,
  type BatchReconciliationReport,
  type RecipeEntity,
  type FinishedProductEntity,
  type MaterialLotEntity,
  type BranchEntity,
  type EmployeeEntity,
} from '@/lib/api'
import {
  createProductionSessionSchema,
  createProductionBatchSchema,
  recordMaterialConsumptionSchema,
  recordProductionOutputSchema,
  recordBakerProductionSchema,
  rejectionReasonOptions,
  attributionMethodOptions,
  type CreateProductionSessionInput,
  type CreateProductionBatchInput,
  type RecordMaterialConsumptionInput,
  type RecordProductionOutputInput,
  type RecordBakerProductionInput,
} from '@/schemas/production.schema'
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
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Factory,
  Flame,
  Layers,
  Lock,
  Plus,
  Scale,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return String(err.response.data.message)
  }
  if (err instanceof Error) {
    return err.message
  }
  return fallback
}

export function ProductionManagementView() {
  const [subTab, setSubTab] = useState<'sessions' | 'batches' | 'bakers' | 'reconciliations'>(
    'sessions'
  )
  const [loading, setLoading] = useState(true)

  // Primary data collections
  const [sessions, setSessions] = useState<ProductionSessionEntity[]>([])
  const [batches, setBatches] = useState<ProductionBatchEntity[]>([])
  const [recipes, setRecipes] = useState<RecipeEntity[]>([])
  const [products, setProducts] = useState<FinishedProductEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [employees, setEmployees] = useState<EmployeeEntity[]>([])
  const [availableLots, setAvailableLots] = useState<MaterialLotEntity[]>([])
  const [bakerProductivity, setBakerProductivity] = useState<BakerProductivitySummary[]>([])

  // Modal dialog states
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [selectedSessionForBatch, setSelectedSessionForBatch] =
    useState<ProductionSessionEntity | null>(null)

  const [isConsumeOpen, setIsConsumeOpen] = useState(false)
  const [selectedBatchForConsume, setSelectedBatchForConsume] =
    useState<ProductionBatchEntity | null>(null)

  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const [selectedBatchForOutput, setSelectedBatchForOutput] =
    useState<ProductionBatchEntity | null>(null)

  const [isBakerOpen, setIsBakerOpen] = useState(false)
  const [selectedBatchForBaker, setSelectedBatchForBaker] =
    useState<ProductionBatchEntity | null>(null)

  const [isDetailBatchOpen, setIsDetailBatchOpen] = useState(false)
  const [detailedBatch, setDetailedBatch] = useState<ProductionBatchEntity | null>(null)

  // Reconciliation view selection
  const [reconciliationBatchId, setReconciliationBatchId] = useState<string>('')
  const [reconciliationData, setReconciliationData] =
    useState<BatchReconciliationReport | null>(null)

  // Refresh data helper
  const loadData = useCallback(async () => {
    try {
      const [
        sessionsData,
        batchesData,
        recipesData,
        productsData,
        branchesData,
        employeesData,
        lotsData,
        productivityData,
      ] = await Promise.all([
        productionApi.getSessions(),
        productionApi.getBatches(),
        recipesApi.getRecipes(),
        recipesApi.getProducts(),
        branchesApi.getBranches(),
        workforceApi.getEmployees(),
        materialsApi.getLots({ status: 'AVAILABLE' }),
        productionApi.getBakerProductivity(),
      ])
      setSessions(sessionsData)
      setBatches(batchesData)
      setRecipes(recipesData)
      setProducts(productsData)
      setBranches(branchesData)
      setEmployees(employeesData)
      setAvailableLots(lotsData)
      setBakerProductivity(productivityData)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to refresh production data'))
    }
  }, [])

  // Initial load effect
  useEffect(() => {
    let ignore = false
    void Promise.all([
      productionApi.getSessions(),
      productionApi.getBatches(),
      recipesApi.getRecipes(),
      recipesApi.getProducts(),
      branchesApi.getBranches(),
      workforceApi.getEmployees(),
      materialsApi.getLots({ status: 'AVAILABLE' }),
      productionApi.getBakerProductivity(),
    ])
      .then(
        ([
          sessionsData,
          batchesData,
          recipesData,
          productsData,
          branchesData,
          employeesData,
          lotsData,
          productivityData,
        ]) => {
          if (ignore) return
          setSessions(sessionsData)
          setBatches(batchesData)
          setRecipes(recipesData)
          setProducts(productsData)
          setBranches(branchesData)
          setEmployees(employeesData)
          setAvailableLots(lotsData)
          setBakerProductivity(productivityData)
          if (batchesData.length > 0) {
            setReconciliationBatchId(batchesData[0].id)
          }
          setLoading(false)
        }
      )
      .catch((err) => {
        if (ignore) return
        toast.error(extractErrorMessage(err, 'Failed to load production data'))
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Load reconciliation when selected batch changes
  useEffect(() => {
    if (!reconciliationBatchId) return
    let ignore = false
    void productionApi
      .getReconciliation(reconciliationBatchId)
      .then((rec) => {
        if (ignore) return
        setReconciliationData(rec)
      })
      .catch((err) => {
        if (ignore) return
        toast.error(extractErrorMessage(err, 'Failed to load batch reconciliation'))
      })
    return () => {
      ignore = true
    }
  }, [reconciliationBatchId])

  // Form: Create Production Session
  const sessionForm = useForm<CreateProductionSessionInput>({
    resolver: zodResolver(createProductionSessionSchema),
    defaultValues: {
      branchId: '',
      sessionNumber: '',
      operationalDate: '',
      startTime: '',
      endTime: null,
      supervisorId: '',
      notes: '',
    },
  })

  const onSubmitSession = async (values: CreateProductionSessionInput) => {
    try {
      await productionApi.createSession(values)
      toast.success('Production session initiated')
      setIsSessionOpen(false)
      sessionForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create production session'))
    }
  }

  // Form: Create Production Batch
  const batchForm = useForm<CreateProductionBatchInput>({
    resolver: zodResolver(createProductionBatchSchema),
    defaultValues: {
      productionSessionId: '',
      recipeId: '',
      recipeVersionId: '',
      batchNumber: '',
      plannedQuantity: 100,
    },
  })

  // Watch selected recipe to populate its active version
  const watchedRecipeId = useWatch({
    control: batchForm.control,
    name: 'recipeId',
  })

  const handleOpenAddBatch = (session: ProductionSessionEntity) => {
    setSelectedSessionForBatch(session)
    const nextBatchNum = `${session.sessionNumber}-B${(session.batchCount ?? 0) + 1}`
    batchForm.reset({
      productionSessionId: session.id,
      recipeId: '',
      recipeVersionId: '',
      batchNumber: nextBatchNum,
      plannedQuantity: 100,
      startTime: session.operationalDate,
    })
    setIsBatchOpen(true)
  }

  const onSubmitBatch = async (values: CreateProductionBatchInput) => {
    try {
      await productionApi.createBatch(values)
      toast.success('Production batch created')
      setIsBatchOpen(false)
      batchForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create production batch'))
    }
  }

  // Form: Consume Materials
  const consumeForm = useForm<RecordMaterialConsumptionInput>({
    resolver: zodResolver(recordMaterialConsumptionSchema),
    defaultValues: {
      consumptions: [{ materialLotId: '', actualQuantity: 1, unitId: '' }],
    },
  })

  const consumeArray = useFieldArray({
    control: consumeForm.control,
    name: 'consumptions',
  })

  const handleOpenConsume = (batch: ProductionBatchEntity) => {
    setSelectedBatchForConsume(batch)
    consumeForm.reset({
      consumptions: [{ materialLotId: '', actualQuantity: 1, unitId: '' }],
    })
    setIsConsumeOpen(true)
  }

  const onSubmitConsume = async (values: RecordMaterialConsumptionInput) => {
    if (!selectedBatchForConsume) return
    try {
      const res = await productionApi.consumeMaterials(selectedBatchForConsume.id, values)
      toast.success(res.message ?? 'Materials consumed and lot stocks updated')
      setIsConsumeOpen(false)
      consumeForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to record material consumption'))
    }
  }

  // Form: Record Outputs & Rejections
  const outputForm = useForm<RecordProductionOutputInput>({
    resolver: zodResolver(recordProductionOutputSchema),
    defaultValues: {
      productId: '',
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      allocationMethod: 'PRODUCTION_QUANTITY',
      rejections: [],
    },
  })

  const rejectionsArray = useFieldArray({
    control: outputForm.control,
    name: 'rejections',
  })

  const handleOpenOutput = (batch: ProductionBatchEntity) => {
    setSelectedBatchForOutput(batch)
    outputForm.reset({
      productId: '',
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      allocationMethod: 'PRODUCTION_QUANTITY',
      rejections: [],
    })
    setIsOutputOpen(true)
  }

  const onSubmitOutput = async (values: RecordProductionOutputInput) => {
    if (!selectedBatchForOutput) return
    try {
      const res = await productionApi.recordOutputs(selectedBatchForOutput.id, values)
      toast.success(res.message ?? 'Batch output recorded successfully')
      setIsOutputOpen(false)
      outputForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to record batch outputs'))
    }
  }

  // Form: Record Baker Attribution
  const bakerForm = useForm<RecordBakerProductionInput>({
    resolver: zodResolver(recordBakerProductionSchema),
    defaultValues: {
      employeeId: '',
      productId: '',
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      attributionMethod: 'INDIVIDUAL_COUNT',
      notes: '',
    },
  })

  const handleOpenBaker = (batch: ProductionBatchEntity) => {
    setSelectedBatchForBaker(batch)
    bakerForm.reset({
      employeeId: '',
      productId: '',
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      attributionMethod: 'INDIVIDUAL_COUNT',
      notes: '',
    })
    setIsBakerOpen(true)
  }

  const onSubmitBaker = async (values: RecordBakerProductionInput) => {
    if (!selectedBatchForBaker) return
    try {
      const res = await productionApi.recordBakerProduction(selectedBatchForBaker.id, values)
      toast.success(res.message ?? 'Baker output attributed successfully')
      setIsBakerOpen(false)
      bakerForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to attribute baker output'))
    }
  }

  // Finalize Batch Action
  const handleFinalizeBatch = async (batchId: string) => {
    try {
      const res = await productionApi.finalizeBatch(batchId)
      toast.success(res.message ?? 'Batch finalized and locked')
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to finalize batch'))
    }
  }

  // View batch detail modal
  const handleViewBatch = async (batchId: string) => {
    try {
      const b = await productionApi.getBatch(batchId)
      setDetailedBatch(b)
      setIsDetailBatchOpen(true)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load batch details'))
    }
  }

  // Calculate summary metrics
  const totalAcceptedOutput = batches.reduce(
    (sum, b) => sum + Number(b.acceptedOutput ?? 0),
    0
  )
  const totalRejectedOutput = batches.reduce(
    (sum, b) => sum + Number(b.rejectedOutput ?? 0),
    0
  )
  const overallTotal = totalAcceptedOutput + totalRejectedOutput
  const overallRejectionRate =
    overallTotal > 0 ? Number(((totalRejectedOutput / overallTotal) * 100).toFixed(2)) : 0
  const activeBatchesCount = batches.filter(
    (b) => b.status === 'DRAFT' || b.status === 'IN_PROGRESS'
  ).length

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production & Baking Floor</h1>
          <p className="text-sm text-muted-foreground">
            Multi-batch scheduling, exact material lot consumption, Mitad baker attribution, and mass output
            reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsSessionOpen(true)}
            className="cursor-pointer gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            <span>Start Production Session</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Sessions</CardTitle>
            <Factory className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length}
            </div>
            <p className="text-xs text-muted-foreground">Live baking shifts across stations</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Batches in Progress</CardTitle>
            <Flame className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{activeBatchesCount}</div>
            <p className="text-xs text-muted-foreground">Scheduled or currently baking</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Accepted Output</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {totalAcceptedOutput.toLocaleString()} pcs
            </div>
            <p className="text-xs text-muted-foreground">Sellable injera produced</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Rejection Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              {overallRejectionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRejectedOutput.toLocaleString()} pcs rejected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-border/80">
        <button
          type="button"
          onClick={() => setSubTab('sessions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'sessions'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Factory className="h-4 w-4" />
          <span>Sessions & Batches ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('batches')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'batches'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flame className="h-4 w-4 text-amber-500" />
          <span>Batch Execution ({batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('bakers')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'bakers'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Baker Productivity ({bakerProductivity.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('reconciliations')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'reconciliations'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Mass & Attribution Reconciliation</span>
        </button>
      </div>

      {/* Sub-tab Content */}
      {loading ? (
        <Card className="border-border/60 p-8 text-center text-xs text-muted-foreground">
          Loading production sessions, batches, and records…
        </Card>
      ) : (
        <>
          {/* TAB 1: Sessions & Multi-Batch Overview */}
          {subTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Production Sessions Overview</h2>
                  <p className="text-xs text-muted-foreground">
                    A production session groups multiple sequential batches during an operational shift.
                  </p>
                </div>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session #</TableHead>
                      <TableHead>Operational Date</TableHead>
                      <TableHead>Branch Station</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead className="text-center">Batches</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                          No production sessions recorded. Click "Start Production Session" above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono font-medium text-xs">
                            {s.sessionNumber}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.operationalDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs">{s.branchName}</TableCell>
                          <TableCell className="text-xs">{s.supervisorName}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              {s.batchCount ?? 0} batches
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : s.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {s.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAddBatch(s)}
                                className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Batch</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TAB 2: Batch Execution */}
          {subTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Production Batches Execution</h2>
                  <p className="text-xs text-muted-foreground">
                    Record exact raw material lot consumption, accepted/rejected output, and finalize batches.
                  </p>
                </div>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Recipe Formulation</TableHead>
                      <TableHead className="text-right">Planned (kg)</TableHead>
                      <TableHead className="text-right">Accepted (pcs)</TableHead>
                      <TableHead className="text-right">Rejected (pcs)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Execution Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
                          No batches created yet. Add a batch from the "Sessions & Batches" tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-medium text-xs">
                            {b.batchNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {b.sessionNumber}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{b.recipeName}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {b.plannedQuantity} kg
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                            {Number(b.acceptedOutput)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-destructive">
                            {Number(b.rejectedOutput)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : b.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {b.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleViewBatch(b.id)}
                                className="h-7 cursor-pointer gap-1 px-1.5 text-[11px]"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Details</span>
                              </Button>

                              {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenConsume(b)}
                                    className="h-7 cursor-pointer gap-1 px-1.5 text-[11px]"
                                    title="Consume Material Lots"
                                  >
                                    <Layers className="h-3 w-3 text-amber-600" />
                                    <span>Consume</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenOutput(b)}
                                    className="h-7 cursor-pointer gap-1 px-1.5 text-[11px]"
                                    title="Record Output & Rejections"
                                  >
                                    <ClipboardList className="h-3 w-3 text-blue-600" />
                                    <span>Output</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenBaker(b)}
                                    className="h-7 cursor-pointer gap-1 px-1.5 text-[11px]"
                                    title="Attribute Baker Output"
                                  >
                                    <Users className="h-3 w-3 text-emerald-600" />
                                    <span>Bakers</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={() => void handleFinalizeBatch(b.id)}
                                    className="h-7 cursor-pointer gap-1 px-2 text-[11px] bg-foreground text-background"
                                    title="Finalize & Lock Batch"
                                  >
                                    <Lock className="h-3 w-3" />
                                    <span>Finalize</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TAB 3: Baker Productivity */}
          {subTab === 'bakers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Mitad Baker Productivity & Quality</h2>
                  <p className="text-xs text-muted-foreground">
                    Distinguishes total output from accepted sellable injera per baker counter reading.
                  </p>
                </div>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baker Name</TableHead>
                      <TableHead className="text-center">Shifts / Sessions</TableHead>
                      <TableHead className="text-right">Total Produced</TableHead>
                      <TableHead className="text-right">Accepted Sellable</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Rejection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bakerProductivity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No individual baker production attributed yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      bakerProductivity.map((b) => (
                        <TableRow key={b.employeeId}>
                          <TableCell className="font-medium text-xs">{b.bakerName}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {b.distinctSessionsWorked} shifts
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {b.totalProduced.toLocaleString()} pcs
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                            {b.acceptedQuantity.toLocaleString()} pcs
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-destructive">
                            {b.rejectedQuantity.toLocaleString()} pcs
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            <span
                              className={
                                b.rejectionRatePercentage > 5 ? 'text-destructive' : 'text-emerald-600'
                              }
                            >
                              {b.rejectionRatePercentage}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TAB 4: Reconciliation & Mass Balance */}
          {subTab === 'reconciliations' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Mass Balance & Baker Output Reconciliation</h2>
                  <p className="text-xs text-muted-foreground">
                    Mathematical invariant:{' '}
                    <code className="text-primary font-mono font-semibold">
                      Team Output = Σ(Baker Attributions) + Unallocated
                    </code>
                    . Never double-counts batch totals.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Select Batch:</span>
                  <select
                    value={reconciliationBatchId}
                    onChange={(e) => setReconciliationBatchId(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} ({b.recipeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {reconciliationData ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Team Total Card */}
                    <Card className="border-border/60 bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                          Batch Team Total Output
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-2xl font-bold font-mono">
                          {reconciliationData.teamOutput.total} pcs
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Accepted: <strong className="text-emerald-600">{reconciliationData.teamOutput.accepted}</strong></span>
                          <span>Rejected: <strong className="text-destructive">{reconciliationData.teamOutput.rejected}</strong></span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Baker Attributed Card */}
                    <Card className="border-border/60 bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                          Baker-Attributed Subtotal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-2xl font-bold font-mono text-primary">
                          {reconciliationData.bakerAttributed.total} pcs
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Accepted: <strong className="text-emerald-600">{reconciliationData.bakerAttributed.accepted}</strong></span>
                          <span>Rejected: <strong className="text-destructive">{reconciliationData.bakerAttributed.rejected}</strong></span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Unallocated Output Card */}
                    <Card className="border-border/60 bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                          Explicitly Unallocated
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <p className="text-2xl font-bold font-mono text-amber-600">
                          {reconciliationData.unallocated.total} pcs
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Accepted: <strong>{reconciliationData.unallocated.accepted}</strong></span>
                          <span>Rejected: <strong>{reconciliationData.unallocated.rejected}</strong></span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border/60 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Strict Mass Reconciliation Status</p>
                        <p className="text-[11px] text-muted-foreground">
                          {reconciliationData.isReconciled
                            ? 'All outputs and baker attributions reconcile with team output. No orphan units or double counting.'
                            : 'Discrepancy detected: baker attribution exceeds batch total.'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      VERIFIED RECONCILED
                    </span>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground">
                  Select a batch above to view reconciliation report.
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* DIALOG: Start Production Session */}
      <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Start Production Session</DialogTitle>
            <DialogDescription className="text-xs">
              Initiate a baking shift session to manage sequential batches.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={sessionForm.handleSubmit(onSubmitSession)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Baking Station / Branch</label>
                <select
                  {...sessionForm.register('branchId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {sessionForm.formState.errors.branchId && (
                  <p className="text-[11px] text-destructive">
                    {sessionForm.formState.errors.branchId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Session Number</label>
                <Input
                  {...sessionForm.register('sessionNumber')}
                  placeholder="e.g. SESS-202611-01"
                  className="text-xs font-mono"
                />
                {sessionForm.formState.errors.sessionNumber && (
                  <p className="text-[11px] text-destructive">
                    {sessionForm.formState.errors.sessionNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Operational Date</label>
                <Input type="date" {...sessionForm.register('operationalDate')} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Supervisor in Charge</label>
                <select
                  {...sessionForm.register('supervisorId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Supervisor --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeNumber})
                    </option>
                  ))}
                </select>
                {sessionForm.formState.errors.supervisorId && (
                  <p className="text-[11px] text-destructive">
                    {sessionForm.formState.errors.supervisorId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Shift Notes</label>
              <textarea
                {...sessionForm.register('notes')}
                placeholder="e.g. Morning baking shift on mitads 1-12"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSessionOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sessionForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {sessionForm.formState.isSubmitting ? 'Starting Session…' : 'Start Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Add Batch to Session */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              New Batch &bull; {selectedSessionForBatch?.sessionNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Schedule a production batch tied to an immutable recipe formulation version.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={batchForm.handleSubmit(onSubmitBatch)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Batch Number</label>
              <Input
                {...batchForm.register('batchNumber')}
                placeholder="e.g. BATCH-202611-01"
                className="text-xs font-mono"
              />
              {batchForm.formState.errors.batchNumber && (
                <p className="text-[11px] text-destructive">{batchForm.formState.errors.batchNumber.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Recipe Formulation</label>
                <select
                  {...batchForm.register('recipeId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Recipe --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {batchForm.formState.errors.recipeId && (
                  <p className="text-[11px] text-destructive">{batchForm.formState.errors.recipeId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Recipe Version</label>
                <select
                  {...batchForm.register('recipeVersionId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Version --</option>
                  {recipes
                    .find((r) => r.id === watchedRecipeId)
                    ?.versions?.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.versionNumber} (Ref {v.referenceBatchQuantity} kg)
                      </option>
                    )) ??
                    recipes.map((r) => (
                      <option key={r.currentVersion?.id ?? r.id} value={r.currentVersion?.id ?? r.id}>
                        {r.name} - v{r.currentVersionNumber ?? 1}
                      </option>
                    ))}
                </select>
                {batchForm.formState.errors.recipeVersionId && (
                  <p className="text-[11px] text-destructive">
                    {batchForm.formState.errors.recipeVersionId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Planned Batch Size (kg / barrel capacity)</label>
              <Input
                type="number"
                step="any"
                {...batchForm.register('plannedQuantity', { valueAsNumber: true })}
                placeholder="100"
                className="text-xs font-mono"
              />
              {batchForm.formState.errors.plannedQuantity && (
                <p className="text-[11px] text-destructive">
                  {batchForm.formState.errors.plannedQuantity.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBatchOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={batchForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {batchForm.formState.isSubmitting ? 'Scheduling…' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Consume Material Lots */}
      <Dialog open={isConsumeOpen} onOpenChange={setIsConsumeOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Record Material Consumption &bull; {selectedBatchForConsume?.batchNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select specific material lots to deduct from active stock with automatic unit cost snapshotting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={consumeForm.handleSubmit(onSubmitConsume)} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Material Lots Consumed</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => consumeArray.append({ materialLotId: '', actualQuantity: 1, unitId: '' })}
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Lot Line</span>
                </Button>
              </div>

              {consumeArray.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                  <div className="col-span-8">
                    <select
                      {...consumeForm.register(`consumptions.${idx}.materialLotId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-mono"
                    >
                      <option value="">-- Choose Material Lot --</option>
                      {availableLots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.lotNumber} ({l.materialName} - Avail: {l.remainingQuantity} {l.unitSymbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="any"
                      {...consumeForm.register(`consumptions.${idx}.actualQuantity` as const, {
                        valueAsNumber: true,
                      })}
                      placeholder="Qty"
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {consumeArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => consumeArray.remove(idx)}
                        className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConsumeOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={consumeForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {consumeForm.formState.isSubmitting ? 'Recording…' : 'Record Consumption'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Record Product Outputs & Rejections */}
      <Dialog open={isOutputOpen} onOpenChange={setIsOutputOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Record Outputs & Quality Rejections &bull; {selectedBatchForOutput?.batchNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enforce mass reconciliation: Actual Output = Accepted Sellable + Quality Rejections.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={outputForm.handleSubmit(onSubmitOutput)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Finished Product</label>
              <select
                {...outputForm.register('productId')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.productCode}]
                  </option>
                ))}
              </select>
              {outputForm.formState.errors.productId && (
                <p className="text-[11px] text-destructive">{outputForm.formState.errors.productId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Accepted Sellable (pcs)</label>
                <Input
                  type="number"
                  {...outputForm.register('acceptedQuantity', { valueAsNumber: true })}
                  placeholder="e.g. 190"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Rejected Injera (pcs)</label>
                <Input
                  type="number"
                  {...outputForm.register('rejectedQuantity', { valueAsNumber: true })}
                  placeholder="e.g. 10"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Detailed Rejections Array */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Detailed Rejection Logs (Optional)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    rejectionsArray.append({
                      reason: 'BURNT',
                      quantity: 1,
                      employeeId: null,
                      notes: '',
                    })
                  }
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Rejection Line</span>
                </Button>
              </div>

              {rejectionsArray.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                  <div className="col-span-5">
                    <select
                      {...outputForm.register(`rejections.${idx}.reason` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      {rejectionReasonOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      {...outputForm.register(`rejections.${idx}.quantity` as const, {
                        valueAsNumber: true,
                      })}
                      placeholder="Qty"
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="col-span-3">
                    <select
                      {...outputForm.register(`rejections.${idx}.employeeId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => rejectionsArray.remove(idx)}
                      className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOutputOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={outputForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {outputForm.formState.isSubmitting ? 'Recording…' : 'Record Outputs'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Record Baker Output Attribution */}
      <Dialog open={isBakerOpen} onOpenChange={setIsBakerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Attribute Baker Output &bull; {selectedBatchForBaker?.batchNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attribute accepted and rejected injera count to an individual Mitad baker without double counting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={bakerForm.handleSubmit(onSubmitBaker)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Select Baker Employee</label>
              <select
                {...bakerForm.register('employeeId')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">-- Choose Baker --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeNumber})
                  </option>
                ))}
              </select>
              {bakerForm.formState.errors.employeeId && (
                <p className="text-[11px] text-destructive">{bakerForm.formState.errors.employeeId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Finished Product</label>
              <select
                {...bakerForm.register('productId')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">-- Choose Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {bakerForm.formState.errors.productId && (
                <p className="text-[11px] text-destructive">{bakerForm.formState.errors.productId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Baker Accepted (pcs)</label>
                <Input
                  type="number"
                  {...bakerForm.register('acceptedQuantity', { valueAsNumber: true })}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Baker Rejected (pcs)</label>
                <Input
                  type="number"
                  {...bakerForm.register('rejectedQuantity', { valueAsNumber: true })}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Attribution Method</label>
              <select
                {...bakerForm.register('attributionMethod')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                {attributionMethodOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBakerOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bakerForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {bakerForm.formState.isSubmitting ? 'Attributing…' : 'Attribute Output'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Batch Details View */}
      <Dialog open={isDetailBatchOpen} onOpenChange={setIsDetailBatchOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Batch {detailedBatch?.batchNumber} Details</span>
              <span className="text-xs font-mono text-primary">{detailedBatch?.recipeName}</span>
            </DialogTitle>
          </DialogHeader>

          {detailedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Planned Quantity</p>
                  <p className="text-xl font-bold font-mono">{detailedBatch.plannedQuantity} kg</p>
                </Card>

                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Accepted Output</p>
                  <p className="text-xl font-bold font-mono text-emerald-600">
                    {Number(detailedBatch.acceptedOutput)} pcs
                  </p>
                </Card>

                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rejected Output</p>
                  <p className="text-xl font-bold font-mono text-destructive">
                    {Number(detailedBatch.rejectedOutput)} pcs
                  </p>
                </Card>
              </div>

              {/* Material Consumptions */}
              <Card className="border-border/60">
                <CardHeader className="py-2.5 px-4 bg-muted/30">
                  <CardTitle className="text-xs font-medium">Material Lots Consumed</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead className="h-7">Lot #</TableHead>
                      <TableHead className="h-7">Material</TableHead>
                      <TableHead className="h-7 text-right">Quantity</TableHead>
                      <TableHead className="h-7 text-right">Cost Snapshot</TableHead>
                      <TableHead className="h-7 text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedBatch.consumptions?.map((c) => (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell className="py-1 font-mono">{c.lotNumber}</TableCell>
                        <TableCell className="py-1">{c.materialName}</TableCell>
                        <TableCell className="py-1 text-right font-mono">
                          {c.actualQuantity} {c.unitSymbol}
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono text-muted-foreground">
                          {Number(c.unitCostSnapshot).toFixed(2)} ETB
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono font-semibold">
                          {Number(c.totalCost).toFixed(2)} ETB
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Baker Production Attributions */}
              <Card className="border-border/60">
                <CardHeader className="py-2.5 px-4 bg-muted/30">
                  <CardTitle className="text-xs font-medium">Baker Production Records</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead className="h-7">Baker Name</TableHead>
                      <TableHead className="h-7 text-right">Accepted</TableHead>
                      <TableHead className="h-7 text-right">Rejected</TableHead>
                      <TableHead className="h-7 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedBatch.bakers?.map((b) => (
                      <TableRow key={b.id} className="text-xs">
                        <TableCell className="py-1 font-medium">{b.bakerName}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-emerald-600">
                          {b.acceptedQuantity} pcs
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono text-destructive">
                          {b.rejectedQuantity} pcs
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono font-semibold">
                          {b.totalProduced} pcs
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsDetailBatchOpen(false)}
              className="cursor-pointer text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
