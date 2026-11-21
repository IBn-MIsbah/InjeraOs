import { useCallback, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  materialsApi,
  branchesApi,
  type MaterialEntity,
  type MaterialCategoryEntity,
  type UnitOfMeasureEntity,
  type SupplierEntity,
  type PurchaseEntity,
  type MaterialLotEntity,
  type MaterialLotMovementEntity,
  type BranchEntity,
} from '@/lib/api'
import {
  createCategorySchema,
  createMaterialSchema,
  createVarietySchema,
  createSupplierSchema,
  createPurchaseSchema,
  adjustLotSchema,
  paymentStatusOptions,
  lotAdjustmentTypeOptions,
  type CreateCategoryInput,
  type CreateMaterialInput,
  type CreateVarietyInput,
  type CreateSupplierInput,
  type CreatePurchaseInput,
  type AdjustLotInput,
} from '@/schemas/materials.schema'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  History,
  Layers,
  Package,
  Plus,
  Scale,
  SlidersHorizontal,
  Truck,
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

export function MaterialsManagementView() {
  const [subTab, setSubTab] = useState<'catalog' | 'suppliers' | 'purchases' | 'lots'>('catalog')
  const [loading, setLoading] = useState(true)

  // Data collections
  const [materials, setMaterials] = useState<MaterialEntity[]>([])
  const [categories, setCategories] = useState<MaterialCategoryEntity[]>([])
  const [units, setUnits] = useState<UnitOfMeasureEntity[]>([])
  const [suppliers, setSuppliers] = useState<SupplierEntity[]>([])
  const [purchases, setPurchases] = useState<PurchaseEntity[]>([])
  const [lots, setLots] = useState<MaterialLotEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)

  // Dialog controls
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [isMatOpen, setIsMatOpen] = useState(false)
  const [isVarietyOpen, setIsVarietyOpen] = useState(false)
  const [selectedMaterialForVariety, setSelectedMaterialForVariety] = useState<MaterialEntity | null>(null)
  const [isSupOpen, setIsSupOpen] = useState(false)
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [selectedLotForAdjust, setSelectedLotForAdjust] = useState<MaterialLotEntity | null>(null)
  const [isMovementsOpen, setIsMovementsOpen] = useState(false)
  const [selectedLotMovements, setSelectedLotMovements] = useState<MaterialLotMovementEntity[]>([])
  const [selectedLotForMovements, setSelectedLotForMovements] = useState<MaterialLotEntity | null>(null)

  // Category Form
  const catForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: '', description: '' },
    mode: 'onTouched',
  })

  // Material Form
  const matForm = useForm<CreateMaterialInput>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: { name: '', categoryId: '', defaultUnitId: '', minimumStock: 0 },
    mode: 'onTouched',
  })

  // Variety Form
  const varietyForm = useForm<CreateVarietyInput>({
    resolver: zodResolver(createVarietySchema),
    defaultValues: { name: '', description: '' },
    mode: 'onTouched',
  })

  // Supplier Form
  const supForm = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: { name: '', phone: '', address: '', contactPerson: '' },
    mode: 'onTouched',
  })

  // Purchase Form
  const purchaseForm = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      branchId: '',
      supplierId: '',
      purchaseNumber: '',
      purchaseDate: '',
      acquisitionCost: 0,
      paymentStatus: 'UNPAID',
      receiveImmediately: true,
      materialId: '',
      varietyId: '',
      unitId: '',
      grossQuantity: 100,
      tareQuantity: 2,
      unusableQuantity: 1,
      purchaseCost: 15000,
    },
    mode: 'onTouched',
  })

  // Watch purchase values for live usable net weight calculation
  const watchedValues = useWatch({ control: purchaseForm.control })
  const watchedGross = watchedValues.grossQuantity ?? 0
  const watchedTare = watchedValues.tareQuantity ?? 0
  const watchedUnusable = watchedValues.unusableQuantity ?? 0
  const watchedCost = watchedValues.purchaseCost ?? 0
  const watchedOverhead = watchedValues.acquisitionCost ?? 0

  const liveUsableNetWeight = Math.max(0, Number(watchedGross) - Number(watchedTare) - Number(watchedUnusable))
  const liveTotalCost = Number(watchedCost) + Number(watchedOverhead)
  const liveUnitCost = liveUsableNetWeight > 0 ? (liveTotalCost / liveUsableNetWeight).toFixed(2) : '0.00'

  // Lot Adjustment Form
  const adjustForm = useForm<AdjustLotInput>({
    resolver: zodResolver(adjustLotSchema),
    defaultValues: { movementType: 'PRODUCTION_CONSUMPTION', quantity: 1, reason: '' },
    mode: 'onTouched',
  })

  const loadAllData = useCallback(async () => {
    try {
      const [mats, cats, uoms, sups, pos, allLots, branchList, lowStockData] = await Promise.all([
        materialsApi.getMaterials(),
        materialsApi.getCategories(),
        materialsApi.getUnits(),
        materialsApi.getSuppliers(),
        materialsApi.getPurchases(),
        materialsApi.getLots(),
        branchesApi.getBranches(),
        materialsApi.getLowStockMaterials(),
      ])

      setMaterials(mats)
      setCategories(cats)
      setUnits(uoms)
      setSuppliers(sups)
      setPurchases(pos)
      setLots(allLots)
      setBranches(branchList)
      setLowStockCount(lowStockData.summary.totalLowStockCount)

      // Prepopulate form defaults
      if (cats.length > 0) matForm.setValue('categoryId', cats[0].id)
      if (uoms.length > 0) {
        matForm.setValue('defaultUnitId', uoms[0].id)
        purchaseForm.setValue('unitId', uoms[0].id)
      }
      if (mats.length > 0) purchaseForm.setValue('materialId', mats[0].id)
      if (sups.length > 0) purchaseForm.setValue('supplierId', sups[0].id)
      if (branchList.length > 0) purchaseForm.setValue('branchId', branchList[0].id)
    } catch (err: unknown) {
      console.error('Failed to load materials data:', err)
      toast.error('Failed to load materials inventory data')
    } finally {
      setLoading(false)
    }
  }, [matForm, purchaseForm])

  useEffect(() => {
    let ignore = false
    void Promise.all([
      materialsApi.getMaterials(),
      materialsApi.getCategories(),
      materialsApi.getUnits(),
      materialsApi.getSuppliers(),
      materialsApi.getPurchases(),
      materialsApi.getLots(),
      branchesApi.getBranches(),
      materialsApi.getLowStockMaterials(),
    ])
      .then(([mats, cats, uoms, sups, pos, allLots, branchList, lowStockData]) => {
        if (ignore) return
        setMaterials(mats)
        setCategories(cats)
        setUnits(uoms)
        setSuppliers(sups)
        setPurchases(pos)
        setLots(allLots)
        setBranches(branchList)
        setLowStockCount(lowStockData.summary.totalLowStockCount)

        if (cats.length > 0) matForm.setValue('categoryId', cats[0].id)
        if (uoms.length > 0) {
          matForm.setValue('defaultUnitId', uoms[0].id)
          purchaseForm.setValue('unitId', uoms[0].id)
        }
        if (mats.length > 0) purchaseForm.setValue('materialId', mats[0].id)
        if (sups.length > 0) purchaseForm.setValue('supplierId', sups[0].id)
        if (branchList.length > 0) purchaseForm.setValue('branchId', branchList[0].id)
        if (!purchaseForm.getValues('purchaseNumber')) {
          purchaseForm.setValue('purchaseNumber', `PO-${Date.now().toString().slice(-6)}`)
          purchaseForm.setValue('purchaseDate', new Date().toISOString().split('T')[0])
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.error('Failed to load materials data:', err)
          toast.error('Failed to load materials inventory data')
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [matForm, purchaseForm])

  // Submissions
  const onCategorySubmit = async (data: CreateCategoryInput) => {
    try {
      const created = await materialsApi.createCategory({
        ...data,
        description: data.description?.trim() ? data.description.trim() : undefined,
      })
      toast.success('Category created', { description: `Added "${created.name}".` })
      setIsCatOpen(false)
      catForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to create category:', err)
      toast.error(extractErrorMessage(err, 'Failed to create category'))
    }
  }

  const onMaterialSubmit = async (data: CreateMaterialInput) => {
    try {
      const created = await materialsApi.createMaterial(data)
      toast.success('Material registered', { description: `Added "${created.name}".` })
      setIsMatOpen(false)
      matForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to register material:', err)
      toast.error(extractErrorMessage(err, 'Failed to register material'))
    }
  }

  const onVarietySubmit = async (data: CreateVarietyInput) => {
    if (!selectedMaterialForVariety) return
    try {
      const created = await materialsApi.createVariety(selectedMaterialForVariety.id, {
        ...data,
        description: data.description?.trim() ? data.description.trim() : undefined,
      })
      toast.success('Variety added', {
        description: `Added "${created.name}" for ${selectedMaterialForVariety.name}.`,
      })
      setIsVarietyOpen(false)
      varietyForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to add variety:', err)
      toast.error(extractErrorMessage(err, 'Failed to add variety'))
    }
  }

  const onSupplierSubmit = async (data: CreateSupplierInput) => {
    try {
      const created = await materialsApi.createSupplier({
        ...data,
        phone: data.phone?.trim() ? data.phone.trim() : undefined,
        address: data.address?.trim() ? data.address.trim() : undefined,
        contactPerson: data.contactPerson?.trim() ? data.contactPerson.trim() : undefined,
      })
      toast.success('Supplier registered', { description: `Added "${created.name}".` })
      setIsSupOpen(false)
      supForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to register supplier:', err)
      toast.error(extractErrorMessage(err, 'Failed to register supplier'))
    }
  }

  const onPurchaseSubmit = async (data: CreatePurchaseInput) => {
    try {
      const usableWeight = data.grossQuantity - data.tareQuantity - data.unusableQuantity
      if (usableWeight <= 0) {
        toast.error('Usable weight must be greater than zero. Check gross, tare, and unusable values.')
        return
      }

      await materialsApi.createPurchase({
        branchId: data.branchId,
        supplierId: data.supplierId,
        purchaseNumber: data.purchaseNumber,
        purchaseDate: data.purchaseDate,
        acquisitionCost: data.acquisitionCost,
        paymentStatus: data.paymentStatus,
        receiveImmediately: data.receiveImmediately,
        items: [
          {
            materialId: data.materialId,
            varietyId: data.varietyId || null,
            unitId: data.unitId,
            grossQuantity: data.grossQuantity,
            tareQuantity: data.tareQuantity,
            unusableQuantity: data.unusableQuantity,
            purchaseCost: data.purchaseCost,
          },
        ],
      })

      toast.success('Purchase recorded successfully', {
        description: data.receiveImmediately
          ? 'Purchase order received and distinct inventory lots created.'
          : 'Purchase draft saved.',
      })
      setIsPurchaseOpen(false)
      purchaseForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to record purchase:', err)
      toast.error(extractErrorMessage(err, 'Failed to record purchase'))
    }
  }

  const onReceivePurchase = async (purchaseId: string) => {
    try {
      const res = await materialsApi.receivePurchase(purchaseId)
      toast.success('Purchase received', {
        description: `Created ${res.data.createdLots.length} material lot(s).`,
      })
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to receive purchase:', err)
      toast.error(extractErrorMessage(err, 'Failed to receive purchase'))
    }
  }

  const onAdjustSubmit = async (data: AdjustLotInput) => {
    if (!selectedLotForAdjust) return
    try {
      await materialsApi.adjustLot(selectedLotForAdjust.id, data)
      toast.success('Stock adjustment recorded', {
        description: `Updated lot ${selectedLotForAdjust.lotNumber}.`,
      })
      setIsAdjustOpen(false)
      adjustForm.reset()
      await loadAllData()
    } catch (err: unknown) {
      console.error('Failed to adjust lot stock:', err)
      toast.error(extractErrorMessage(err, 'Stock adjustment failed'))
    }
  }

  const onViewMovements = async (lot: MaterialLotEntity) => {
    try {
      setSelectedLotForMovements(lot)
      const data = await materialsApi.getLotMovements(lot.id)
      setSelectedLotMovements(data.movements)
      setIsMovementsOpen(true)
    } catch (err: unknown) {
      console.error('Failed to load lot movements:', err)
      toast.error('Failed to load lot movement audit history')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Materials & Purchasing
          </h2>
          <p className="text-xs text-muted-foreground">
            Catalog, suppliers, lot-based raw material inventory, and tare weight calculations.
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'catalog'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Catalog & Varieties
          </button>
          <button
            type="button"
            onClick={() => setSubTab('suppliers')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'suppliers'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Suppliers
          </button>
          <button
            type="button"
            onClick={() => setSubTab('purchases')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'purchases'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Purchases & Receiving
          </button>
          <button
            type="button"
            onClick={() => setSubTab('lots')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              subTab === 'lots'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Lots & Stock
          </button>
        </div>
      </div>

      {/* Grouped Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Materials Catalog</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {materials.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {categories.length} active material categories
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Active Storage Lots</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              {lots.filter((l) => l.status === 'AVAILABLE').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Distinct lots with available stock
          </CardContent>
        </Card>

        <Card
          className={`border-border/80 ${
            lowStockCount > 0
              ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
              : ''
          }`}
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Low Stock Alert</CardDescription>
            <CardTitle
              className={`text-2xl font-semibold tracking-tight ${
                lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''
              }`}
            >
              {lowStockCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Materials at or below minimum threshold
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Active Suppliers</CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {suppliers.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Farmers unions & packaging partners
          </CardContent>
        </Card>
      </div>

      {/* Sub-Tab 1: Catalog & Varieties */}
      {subTab === 'catalog' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Material Catalog</CardTitle>
              <CardDescription className="text-xs">
                Raw grains, fermentation inputs, packaging, and custom additives.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Add Category Dialog */}
              <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
                <DialogTrigger render={<Button variant="outline" className="gap-2 text-xs" />}>
                  <Layers className="h-3.5 w-3.5" />
                  New Category
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Material Category</DialogTitle>
                    <DialogDescription className="text-xs">
                      Group related inputs (e.g. Teff Grain, Yeast, Packaging).
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={catForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Category Name *</label>
                      <Input
                        placeholder="e.g. Teff Grains"
                        {...catForm.register('name')}
                        aria-invalid={!!catForm.formState.errors.name}
                      />
                      {catForm.formState.errors.name && (
                        <p className="text-[11px] text-destructive">
                          {catForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Description</label>
                      <Input
                        placeholder="Optional description"
                        {...catForm.register('description')}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCatOpen(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={catForm.formState.isSubmitting}
                        className="text-xs"
                      >
                        Create Category
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add Material Dialog */}
              <Dialog open={isMatOpen} onOpenChange={setIsMatOpen}>
                <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Material
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Register New Raw Material</DialogTitle>
                    <DialogDescription className="text-xs">
                      Add a baking ingredient, packaging item, or consumable input.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={matForm.handleSubmit(onMaterialSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Material Name *</label>
                      <Input
                        placeholder="e.g. Teff Grain, Yeast, Wood Logs"
                        {...matForm.register('name')}
                      />
                      {matForm.formState.errors.name && (
                        <p className="text-[11px] text-destructive">
                          {matForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Category *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...matForm.register('categoryId')}
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Default Unit *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...matForm.register('defaultUnitId')}
                        >
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Minimum Stock Alert Threshold
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        {...matForm.register('minimumStock', { valueAsNumber: true })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Alert triggers when available lot quantity drops to or below this level.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMatOpen(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={matForm.formState.isSubmitting}
                        className="text-xs"
                      >
                        Save Material
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading catalog...</div>
            ) : materials.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No materials registered yet. Create your first raw material above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Material Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Default Unit</TableHead>
                    <TableHead className="text-xs">Current Stock</TableHead>
                    <TableHead className="text-xs">Min Threshold</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Varieties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {m.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.categoryName}</TableCell>
                      <TableCell className="text-xs">{m.defaultUnitSymbol}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {m.currentStock ?? 0} {m.defaultUnitSymbol}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.minimumStock} {m.defaultUnitSymbol}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Sufficient
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedMaterialForVariety(m)
                            setIsVarietyOpen(true)
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Variety
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {/* Add Variety Dialog */}
          <Dialog open={isVarietyOpen} onOpenChange={setIsVarietyOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Material Variety</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a specific type or grade for{' '}
                  <span className="font-semibold text-foreground">
                    {selectedMaterialForVariety?.name}
                  </span>{' '}
                  (e.g. Magna, Sergegna, Tikur).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={varietyForm.handleSubmit(onVarietySubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Variety Name *</label>
                  <Input
                    placeholder="e.g. Magna (Grade 1 White)"
                    {...varietyForm.register('name')}
                  />
                  {varietyForm.formState.errors.name && (
                    <p className="text-[11px] text-destructive">
                      {varietyForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Description / Grade</label>
                  <Input
                    placeholder="Optional characteristics"
                    {...varietyForm.register('description')}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVarietyOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={varietyForm.formState.isSubmitting}
                    className="text-xs"
                  >
                    Save Variety
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      {/* Sub-Tab 2: Suppliers */}
      {subTab === 'suppliers' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Supplier Directory</CardTitle>
              <CardDescription className="text-xs">
                Grain cooperatives, farmers, firewood providers, and packaging vendors.
              </CardDescription>
            </div>

            <Dialog open={isSupOpen} onOpenChange={setIsSupOpen}>
              <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                <Truck className="h-3.5 w-3.5" />
                Add Supplier
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Register Supplier</DialogTitle>
                  <DialogDescription className="text-xs">
                    Record supplier contact information for purchasing and traceability.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={supForm.handleSubmit(onSupplierSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Supplier Name *</label>
                    <Input
                      placeholder="e.g. Ada'a Agricultural Cooperative"
                      {...supForm.register('name')}
                    />
                    {supForm.formState.errors.name && (
                      <p className="text-[11px] text-destructive">
                        {supForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Contact Person</label>
                      <Input placeholder="e.g. Bekele Tadesse" {...supForm.register('contactPerson')} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Phone Number</label>
                      <Input placeholder="+251 9..." {...supForm.register('phone')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Physical Address / Hub</label>
                    <Input placeholder="e.g. Bishoftu, Oromia" {...supForm.register('address')} />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSupOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={supForm.formState.isSubmitting}
                      className="text-xs"
                    >
                      Save Supplier
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No suppliers registered yet. Add your primary grain supplier above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Supplier Name</TableHead>
                    <TableHead className="text-xs">Contact Person</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Address</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-medium text-foreground">{s.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.contactPerson ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {s.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.address ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          {s.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Tab 3: Purchases & Receiving */}
      {subTab === 'purchases' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Purchasing & Ingestion</CardTitle>
              <CardDescription className="text-xs">
                Tare weight deduction, transport overhead allocation, and lot creation.
              </CardDescription>
            </div>

            <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
              <DialogTrigger render={<Button className="gap-2 text-xs" />}>
                <Scale className="h-3.5 w-3.5" />
                Record Purchase
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Record Raw Material Purchase</DialogTitle>
                  <DialogDescription className="text-xs">
                    Computes usable net weight (Gross - Tare - Unusable) and unit acquisition cost.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)} className="space-y-5">
                  {/* Logical Group 1: Invoice & Supplier Info */}
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      1. Purchase Details
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Purchase Number *</label>
                        <Input {...purchaseForm.register('purchaseNumber')} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Purchase Date *</label>
                        <Input type="date" {...purchaseForm.register('purchaseDate')} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Supplier *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...purchaseForm.register('supplierId')}
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Destination Branch *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...purchaseForm.register('branchId')}
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Logical Group 2: Weight Breakdown & Usable Calculation */}
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      2. Weight & Tare Deduction
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Material *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...purchaseForm.register('materialId')}
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Unit of Measure *</label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...purchaseForm.register('unitId')}
                        >
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Gross Weight *</label>
                        <Input
                          type="number"
                          step="any"
                          {...purchaseForm.register('grossQuantity', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Tare (Packaging)</label>
                        <Input
                          type="number"
                          step="any"
                          {...purchaseForm.register('tareQuantity', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Unusable (Dirt/Stones)</label>
                        <Input
                          type="number"
                          step="any"
                          {...purchaseForm.register('unusableQuantity', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    {/* Live Calculation Callout */}
                    <div className="rounded-md border border-border bg-background p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          Calculated Usable Net Quantity:
                        </span>
                        <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {liveUsableNetWeight.toFixed(2)} units
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">
                          True Acquisition Cost / Unit:
                        </span>
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {liveUnitCost} ETB / unit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logical Group 3: Financials & Receiving Option */}
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      3. Costs & Stock Ingestion
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Purchase Amount (ETB) *</label>
                        <Input
                          type="number"
                          step="any"
                          {...purchaseForm.register('purchaseCost', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Transport & Overhead (ETB)</label>
                        <Input
                          type="number"
                          step="any"
                          {...purchaseForm.register('acquisitionCost', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="text-xs font-medium text-foreground">Payment Status</label>
                      <select
                        className="rounded-md border border-input bg-background px-3 py-1 text-xs"
                        {...purchaseForm.register('paymentStatus')}
                      >
                        {paymentStatusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 pt-2 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary shadow-xs"
                        {...purchaseForm.register('receiveImmediately')}
                      />
                      Receive into inventory immediately (creates distinct material lots)
                    </label>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPurchaseOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={purchaseForm.formState.isSubmitting}
                      className="text-xs"
                    >
                      Record Purchase
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading purchases...</div>
            ) : purchases.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No purchases recorded yet. Record a new raw material order above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">PO Number</TableHead>
                    <TableHead className="text-xs">Purchase Date</TableHead>
                    <TableHead className="text-xs">Items Count</TableHead>
                    <TableHead className="text-xs">Total Amount</TableHead>
                    <TableHead className="text-xs">Overhead Cost</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium text-foreground font-mono">
                        {p.purchaseNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{p.items?.length ?? 1}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {Number(p.totalAmount).toLocaleString()} ETB
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {Number(p.acquisitionCost).toLocaleString()} ETB
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            p.status === 'RECEIVED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {p.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onReceivePurchase(p.id)}
                          >
                            Receive Lots
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Tab 4: Lots & Movements */}
      {subTab === 'lots' && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-medium">Material Lots & Balances</CardTitle>
              <CardDescription className="text-xs">
                Independent batches with explicit acquisition unit costs and partial consumption tracking.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading storage lots...</div>
            ) : lots.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No lots in storage. Receive a purchase order to create distinct material lots.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Lot Number</TableHead>
                    <TableHead className="text-xs">Material</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Original Qty</TableHead>
                    <TableHead className="text-xs">Remaining Balance</TableHead>
                    <TableHead className="text-xs">Unit Cost (ETB)</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs font-mono font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                          {l.lotNumber}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.materialName} {l.varietyName ? `(${l.varietyName})` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.branchName}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {l.originalQuantity} {l.unitSymbol}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        <span
                          className={
                            Number(l.remainingQuantity) === 0
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }
                        >
                          {l.remainingQuantity} {l.unitSymbol}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {Number(l.unitCost).toFixed(2)} ETB
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            l.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <div className="flex items-center justify-end gap-1">
                          {l.status === 'AVAILABLE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedLotForAdjust(l)
                                setIsAdjustOpen(true)
                              }}
                            >
                              <SlidersHorizontal className="mr-1 h-3 w-3" /> Adjust
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onViewMovements(l)}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {/* Adjust Lot Stock Dialog */}
          <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adjust Lot Stock</DialogTitle>
                <DialogDescription className="text-xs">
                  Record consumption, transfer, or stock correction for{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {selectedLotForAdjust?.lotNumber}
                  </span>
                  . (Available: {selectedLotForAdjust?.remainingQuantity}{' '}
                  {selectedLotForAdjust?.unitSymbol})
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Action Type *</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...adjustForm.register('movementType')}
                  >
                    {lotAdjustmentTypeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Quantity *</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Quantity to consume or adjust"
                    {...adjustForm.register('quantity', { valueAsNumber: true })}
                  />
                  {adjustForm.formState.errors.quantity && (
                    <p className="text-[11px] text-destructive">
                      {adjustForm.formState.errors.quantity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Reason / Reference *
                  </label>
                  <Input
                    placeholder="e.g. Batch B-201 dough mixing, Spoilage, Physical recount"
                    {...adjustForm.register('reason')}
                  />
                  {adjustForm.formState.errors.reason && (
                    <p className="text-[11px] text-destructive">
                      {adjustForm.formState.errors.reason.message}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdjustOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={adjustForm.formState.isSubmitting}
                    className="text-xs"
                  >
                    Confirm Adjustment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* View Lot Movements Audit Trail Dialog */}
          <Dialog open={isMovementsOpen} onOpenChange={setIsMovementsOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Lot Movement Audit Trail</DialogTitle>
                <DialogDescription className="text-xs">
                  Reconciled inventory movements for lot{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {selectedLotForMovements?.lotNumber}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                {selectedLotMovements.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">No movements recorded.</p>
                ) : (
                  selectedLotMovements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              m.movementType === 'PURCHASE_RECEIPT'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {m.movementType}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(m.occurredAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Ref: {m.referenceType}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono font-semibold text-foreground">
                          {m.quantity} units
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          @ {Number(m.unitCostSnapshot).toFixed(2)} ETB/unit
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMovementsOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      )}
    </div>
  )
}
