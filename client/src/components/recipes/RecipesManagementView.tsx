import { useCallback, useEffect, useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  recipesApi,
  materialsApi,
  branchesApi,
  type RecipeEntity,
  type RecipeVersionEntity,
  type FinishedProductEntity,
  type BlendOperationEntity,
  type ScaledRecipeResult,
  type MaterialEntity,
  type UnitOfMeasureEntity,
  type MaterialLotEntity,
  type BranchEntity,
} from '@/lib/api'
import {
  createFinishedProductSchema,
  createRecipeSchema,
  createRecipeVersionSchema,
  scaleRecipeSchema,
  createBlendOperationSchema,
  type CreateFinishedProductInput,
  type CreateRecipeInput,
  type CreateRecipeVersionInput,
  type ScaleRecipeInput,
  type CreateBlendOperationInput,
} from '@/schemas/recipes.schema'
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
} from '@/components/ui/dialog'
import {
  AlertCircle,
  Calculator,
  ChefHat,
  Eye,
  GitBranch,
  History,
  Layers,
  Package,
  Plus,
  Scale,
  Trash2,
  Wheat,
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

export function RecipesManagementView() {
  const [subTab, setSubTab] = useState<'recipes' | 'scaling' | 'blending' | 'products'>('recipes')
  const [loading, setLoading] = useState(true)

  // Primary data collections
  const [recipes, setRecipes] = useState<RecipeEntity[]>([])
  const [products, setProducts] = useState<FinishedProductEntity[]>([])
  const [blends, setBlends] = useState<BlendOperationEntity[]>([])
  const [materials, setMaterials] = useState<MaterialEntity[]>([])
  const [units, setUnits] = useState<UnitOfMeasureEntity[]>([])
  const [branches, setBranches] = useState<BranchEntity[]>([])
  const [availableLots, setAvailableLots] = useState<MaterialLotEntity[]>([])

  // Modal states
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false)
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false)
  const [selectedRecipeForVersion, setSelectedRecipeForVersion] = useState<RecipeEntity | null>(null)
  const [isViewRecipeOpen, setIsViewRecipeOpen] = useState(false)
  const [detailedRecipe, setDetailedRecipe] = useState<RecipeEntity | null>(null)
  const [isBlendOpen, setIsBlendOpen] = useState(false)
  const [isViewBlendOpen, setIsViewBlendOpen] = useState(false)
  const [detailedBlend, setDetailedBlend] = useState<BlendOperationEntity | null>(null)

  // Scaling state
  const [scalingRecipeId, setScalingRecipeId] = useState<string>('')
  const [scalingResult, setScalingResult] = useState<ScaledRecipeResult | null>(null)
  const [scalingLoading, setScalingLoading] = useState(false)

  // Load all foundational data for refreshes
  const loadData = useCallback(async () => {
    try {
      const [
        recipesData,
        productsData,
        blendsData,
        materialsData,
        unitsData,
        branchesData,
        lotsData,
      ] = await Promise.all([
        recipesApi.getRecipes(),
        recipesApi.getProducts(),
        recipesApi.getBlends(),
        materialsApi.getMaterials(),
        materialsApi.getUnits(),
        branchesApi.getBranches(),
        materialsApi.getLots({ status: 'AVAILABLE' }),
      ])
      setRecipes(recipesData)
      setProducts(productsData)
      setBlends(blendsData)
      setMaterials(materialsData)
      setUnits(unitsData)
      setBranches(branchesData)
      setAvailableLots(lotsData)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load recipe & blending data'))
    }
  }, [])

  useEffect(() => {
    let ignore = false
    void Promise.all([
      recipesApi.getRecipes(),
      recipesApi.getProducts(),
      recipesApi.getBlends(),
      materialsApi.getMaterials(),
      materialsApi.getUnits(),
      branchesApi.getBranches(),
      materialsApi.getLots({ status: 'AVAILABLE' }),
    ])
      .then(
        ([
          recipesData,
          productsData,
          blendsData,
          materialsData,
          unitsData,
          branchesData,
          lotsData,
        ]) => {
          if (ignore) return
          setRecipes(recipesData)
          setProducts(productsData)
          setBlends(blendsData)
          setMaterials(materialsData)
          setUnits(unitsData)
          setBranches(branchesData)
          setAvailableLots(lotsData)
          setLoading(false)
        }
      )
      .catch((err) => {
        if (ignore) return
        toast.error(extractErrorMessage(err, 'Failed to load recipe & blending data'))
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Form: Finished Product
  const productForm = useForm<CreateFinishedProductInput>({
    resolver: zodResolver(createFinishedProductSchema),
    defaultValues: {
      name: '',
      productCode: '',
      size: '',
      unitId: '',
      defaultSellingPrice: 0,
      isActive: true,
    },
  })

  const onSubmitProduct = async (values: CreateFinishedProductInput) => {
    try {
      await recipesApi.createProduct(values)
      toast.success('Finished product added to catalog')
      setIsProductOpen(false)
      productForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create finished product'))
    }
  }

  // Form: Create Recipe (Version 1)
  const recipeForm = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema),
    defaultValues: {
      name: '',
      productId: '',
      branchId: '',
      description: '',
      referenceBatchQuantity: 100,
      expectedYield: 200,
      instructions: '',
      effectiveFrom: '',
      ingredients: [{ materialId: '', varietyId: null, unitId: '', expectedQuantity: 1, notes: '' }],
    },
  })

  const recipeIngredientsArray = useFieldArray({
    control: recipeForm.control,
    name: 'ingredients',
  })

  const onSubmitRecipe = async (values: CreateRecipeInput) => {
    try {
      await recipesApi.createRecipe({
        ...values,
        branchId: values.branchId ? values.branchId : null,
      })
      toast.success('Recipe and Version 1 created successfully')
      setIsRecipeOpen(false)
      recipeForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create recipe'))
    }
  }

  // Form: Create New Recipe Version (Immutability Bump)
  const versionForm = useForm<CreateRecipeVersionInput>({
    resolver: zodResolver(createRecipeVersionSchema),
    defaultValues: {
      referenceBatchQuantity: 100,
      expectedYield: 200,
      instructions: '',
      effectiveFrom: '',
      ingredients: [{ materialId: '', varietyId: null, unitId: '', expectedQuantity: 1, notes: '' }],
    },
  })

  const versionIngredientsArray = useFieldArray({
    control: versionForm.control,
    name: 'ingredients',
  })

  const handleOpenNewVersion = (recipe: RecipeEntity) => {
    setSelectedRecipeForVersion(recipe)
    versionForm.reset({
      referenceBatchQuantity: recipe.referenceBatchQuantity ?? 100,
      expectedYield: recipe.expectedYield ?? 200,
      instructions: '',
      effectiveFrom: '',
      ingredients: [{ materialId: '', varietyId: null, unitId: '', expectedQuantity: 1, notes: '' }],
    })
    setIsNewVersionOpen(true)
  }

  const onSubmitVersion = async (values: CreateRecipeVersionInput) => {
    if (!selectedRecipeForVersion) return
    try {
      const res = await recipesApi.createRecipeVersion(selectedRecipeForVersion.id, values)
      toast.success(res.message ?? 'New recipe version created')
      setIsNewVersionOpen(false)
      versionForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create new recipe version'))
    }
  }

  // View recipe detail with all versions
  const handleViewRecipe = async (recipeId: string) => {
    try {
      const data = await recipesApi.getRecipe(recipeId)
      setDetailedRecipe(data)
      setIsViewRecipeOpen(true)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load recipe details'))
    }
  }

  // Form: Scale Recipe
  const scaleForm = useForm<ScaleRecipeInput>({
    resolver: zodResolver(scaleRecipeSchema),
    defaultValues: {
      plannedBatchQuantity: 150,
    },
  })

  const handleRunScale = async (values: ScaleRecipeInput) => {
    if (!scalingRecipeId) {
      toast.error('Please select a recipe to scale')
      return
    }
    try {
      setScalingLoading(true)
      const res = await recipesApi.scaleRecipe(scalingRecipeId, values)
      setScalingResult(res)
      toast.success(`Recipe scaled by factor ${res.scalingFactor}x`)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to scale recipe'))
    } finally {
      setScalingLoading(false)
    }
  }

  // Form: Blend Operation
  const blendForm = useForm<CreateBlendOperationInput>({
    resolver: zodResolver(createBlendOperationSchema),
    defaultValues: {
      branchId: '',
      operationNumber: '',
      operationDate: '',
      targetMaterialId: '',
      targetVarietyId: null,
      targetUnitId: '',
      processingLoss: 0,
      processingCost: 0,
      inputs: [{ materialLotId: '', quantityConsumed: 0 }],
    },
  })

  const blendInputsArray = useFieldArray({
    control: blendForm.control,
    name: 'inputs',
  })

  // Watch blend fields for live mass & cost calculations
  const watchedBlendInputs = useWatch({
    control: blendForm.control,
    name: 'inputs',
  })
  const watchedLoss = useWatch({
    control: blendForm.control,
    name: 'processingLoss',
  })
  const watchedProcCost = useWatch({
    control: blendForm.control,
    name: 'processingCost',
  })

  // Compute live blend preview
  const lotMap = new Map(availableLots.map((l) => [l.id, l]))
  let previewInputQty = 0
  let previewInputCost = 0
  if (Array.isArray(watchedBlendInputs)) {
    for (const inp of watchedBlendInputs) {
      const qty = Number(inp?.quantityConsumed) || 0
      const lot = inp?.materialLotId ? lotMap.get(inp.materialLotId) : undefined
      const unitCost = lot ? Number(lot.unitCost) : 0
      previewInputQty += qty
      previewInputCost += qty * unitCost
    }
  }
  const previewLoss = Number(watchedLoss) || 0
  const previewProcCost = Number(watchedProcCost) || 0
  const previewOutputQty = Math.max(0, Number((previewInputQty - previewLoss).toFixed(4)))
  const previewTotalCost = Number((previewInputCost + previewProcCost).toFixed(2))
  const previewUnitCost = previewOutputQty > 0 ? Number((previewTotalCost / previewOutputQty).toFixed(4)) : 0

  const onSubmitBlend = async (values: CreateBlendOperationInput) => {
    try {
      const res = await recipesApi.createBlend({
        ...values,
        targetVarietyId: values.targetVarietyId ? values.targetVarietyId : null,
      })
      toast.success(res.message ?? 'Blend operation completed successfully')
      setIsBlendOpen(false)
      blendForm.reset()
      await loadData()
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to complete blend operation'))
    }
  }

  // View blend detail
  const handleViewBlend = async (blendId: string) => {
    try {
      const data = await recipesApi.getBlend(blendId)
      setDetailedBlend(data)
      setIsViewBlendOpen(true)
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load blend operation details'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Cards */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recipes & Pre-Mixed Teff</h1>
          <p className="text-sm text-muted-foreground">
            Immutable formulation versions, proportional batch scaling, and mass-conserved teff blending.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProductOpen(true)}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <Package className="h-4 w-4" />
            <span>Add Finished Product</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBlendOpen(true)}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <Wheat className="h-4 w-4 text-amber-600" />
            <span>Record Pre-Mix Blend</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsRecipeOpen(true)}
            className="cursor-pointer gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            <span>New Recipe Formulation</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Recipes</CardTitle>
            <ChefHat className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipes.length}</div>
            <p className="text-xs text-muted-foreground">Versioned baking formulations</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Finished Products</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Catalog products available for sale</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pre-Mix Operations</CardTitle>
            <Wheat className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blends.length}</div>
            <p className="text-xs text-muted-foreground">Teff blends with tracked ancestry</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Scaling Engine</CardTitle>
            <Calculator className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Variable Bins</div>
            <p className="text-xs text-muted-foreground">Proportional mass & yield scaling</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-border/80">
        <button
          type="button"
          onClick={() => setSubTab('recipes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'recipes'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChefHat className="h-4 w-4" />
          <span>Recipes & Formulations ({recipes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('scaling')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'scaling'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Batch Sizing & Scaling</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('blending')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'blending'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wheat className="h-4 w-4" />
          <span>Pre-Mix Blending ({blends.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('products')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            subTab === 'products'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Finished Products ({products.length})</span>
        </button>
      </div>

      {/* Sub-tab Content */}
      {loading ? (
        <Card className="border-border/60 p-8 text-center text-xs text-muted-foreground">
          Loading recipes and formulation catalog…
        </Card>
      ) : (
        <>
          {/* TAB 1: Recipes & Formulations */}
          {subTab === 'recipes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Baking Recipes & Version Control</h2>
                  <p className="text-xs text-muted-foreground">
                    Recipes enforce immutable versioning: modifying formulation creates a new version while preserving historical records.
                  </p>
                </div>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipe Name</TableHead>
                      <TableHead>Finished Product</TableHead>
                      <TableHead>Branch Scope</TableHead>
                      <TableHead className="text-center">Current Version</TableHead>
                      <TableHead className="text-right">Ref Batch Qty</TableHead>
                      <TableHead className="text-right">Expected Yield</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                          No recipes created yet. Click "New Recipe Formulation" above to create your first recipe.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recipes.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-xs">
                            <div className="flex items-center gap-2">
                              <span>{r.name}</span>
                              {r.description && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  ({r.description})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold">{r.productName}</span>{' '}
                            {r.productCode && (
                              <span className="text-[10px] text-muted-foreground">[{r.productCode}]</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.branchName ?? 'All Branches'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              v{r.currentVersionNumber ?? 1}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {r.referenceBatchQuantity} kg
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                            {r.expectedYield} pcs
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleViewRecipe(r.id)}
                                className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                              >
                                <Eye className="h-3 w-3" />
                                <span>History</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenNewVersion(r)}
                                className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                              >
                                <History className="h-3 w-3 text-primary" />
                                <span>Bump Version</span>
                              </Button>
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

          {/* TAB 2: Batch Sizing & Scaling */}
          {subTab === 'scaling' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold">Proportional Batch Sizing Calculator</h2>
                <p className="text-xs text-muted-foreground">
                  Test the mathematical invariant:{' '}
                  <code className="text-primary font-mono">λ = Q_planned / Q_ref</code>. Scaled ingredients and
                  expected yields adjust linearly to match actual barrel capacities.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-border/60 md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-xs font-medium">Batch Scaling Inputs</CardTitle>
                    <CardDescription className="text-xs">
                      Select target recipe and planned dough/flour batch size.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Select Recipe</label>
                      <select
                        value={scalingRecipeId}
                        onChange={(e) => {
                          setScalingRecipeId(e.target.value)
                          setScalingResult(null)
                        }}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                      >
                        <option value="">-- Choose Recipe --</option>
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Ref: {r.referenceBatchQuantity} kg, Yield: {r.expectedYield})
                          </option>
                        ))}
                      </select>
                    </div>

                    <form onSubmit={scaleForm.handleSubmit(handleRunScale)} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Planned Batch Size (kg)</label>
                        <Input
                          type="number"
                          step="any"
                          {...scaleForm.register('plannedBatchQuantity', { valueAsNumber: true })}
                          placeholder="e.g. 150"
                          className="text-xs"
                        />
                        {scaleForm.formState.errors.plannedBatchQuantity && (
                          <p className="text-[11px] text-destructive">
                            {scaleForm.formState.errors.plannedBatchQuantity.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={scalingLoading || !scalingRecipeId}
                        className="w-full cursor-pointer gap-2 text-xs"
                      >
                        <Calculator className="h-4 w-4" />
                        <span>{scalingLoading ? 'Calculating…' : 'Calculate Scaled Batch'}</span>
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-4">
                  {scalingResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Card className="border-border/60 bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Scaling Factor (λ)</p>
                          <p className="text-xl font-bold font-mono text-primary">
                            {scalingResult.scalingFactor.toFixed(4)}x
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {scalingResult.plannedBatchQuantity} kg / {scalingResult.referenceBatchQuantity} kg
                          </p>
                        </Card>

                        <Card className="border-border/60 bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Base Expected Yield</p>
                          <p className="text-xl font-bold font-mono">
                            {scalingResult.baseExpectedYield} pcs
                          </p>
                          <p className="text-[10px] text-muted-foreground">at reference batch size</p>
                        </Card>

                        <Card className="border-border/60 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20 p-3">
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">
                            Scaled Expected Yield
                          </p>
                          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {scalingResult.scaledExpectedYield} pcs
                          </p>
                          <p className="text-[10px] text-muted-foreground">projected output for planned batch</p>
                        </Card>
                      </div>

                      <Card className="border-border/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-xs font-medium">Scaled Ingredient Bill of Materials</CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient / Material</TableHead>
                              <TableHead className="text-right">Base Qty</TableHead>
                              <TableHead className="text-right">Scaled Qty</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scalingResult.scaledIngredients.map((ing) => (
                              <TableRow key={ing.id}>
                                <TableCell className="font-medium text-xs">{ing.materialName}</TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                  {ing.baseExpectedQuantity}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs font-bold text-primary">
                                  {ing.scaledExpectedQuantity}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{ing.unitSymbol}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{ing.notes ?? '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    </div>
                  ) : (
                    <Card className="border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground">
                      <Calculator className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p>Select a recipe on the left and enter a planned batch size to compute scaled formulation.</p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pre-Mix Blending */}
          {subTab === 'blending' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Pre-Mixed Teff Operations</h2>
                  <p className="text-xs text-muted-foreground">
                    Conservation of Mass & True Cost Allocation: blends deduct from raw lots and create a traceable blend lot with complete parent ancestry.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsBlendOpen(true)}
                  className="cursor-pointer gap-1.5 text-xs bg-foreground text-background"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record Pre-Mix Blend</span>
                </Button>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-center">Inputs Used</TableHead>
                      <TableHead className="text-right">Output Qty</TableHead>
                      <TableHead className="text-right">Proc. Loss</TableHead>
                      <TableHead className="text-right">Proc. Cost</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blends.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                          No blending operations recorded. Click "Record Pre-Mix Blend" to combine grain lots.
                        </TableCell>
                      </TableRow>
                    ) : (
                      blends.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-medium text-xs">{b.operationNumber}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(b.operationDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs">{b.branchName}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {b.inputsCount ?? '—'} lots
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">
                            {b.outputQuantity} kg
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">
                            {b.processingLoss > 0 ? `-${b.processingLoss} kg` : '0 kg'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {b.processingCost.toFixed(2)} ETB
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {b.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleViewBlend(b.id)}
                              className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                            >
                              <Layers className="h-3 w-3 text-amber-600" />
                              <span>Ancestry</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* TAB 4: Finished Products */}
          {subTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Finished Products Catalog</h2>
                  <p className="text-xs text-muted-foreground">
                    Products manufactured by the bakery (Injera varieties, packaging sizes, and default retail prices).
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsProductOpen(true)}
                  className="cursor-pointer gap-1.5 text-xs bg-foreground text-background"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Finished Product</span>
                </Button>
              </div>

              <Card className="border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Size / Spec</TableHead>
                      <TableHead>Default Unit</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No finished products added yet. Click "Add Finished Product" to register one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs font-semibold">{p.productCode}</TableCell>
                          <TableCell className="font-medium text-xs">{p.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.size ?? 'Standard'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.unitSymbol ?? 'pcs'}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                            {p.defaultSellingPrice.toFixed(2)} ETB
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {p.isActive ? 'ACTIVE' : 'INACTIVE'}
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
        </>
      )}

      {/* DIALOG: Add Finished Product */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Add Finished Product</DialogTitle>
            <DialogDescription className="text-xs">
              Register a finished commercial bakery product (e.g., 100% White Teff Injera).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={productForm.handleSubmit(onSubmitProduct)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Product Name</label>
              <Input
                {...productForm.register('name')}
                placeholder="e.g. Premium White Teff Injera"
                className="text-xs"
              />
              {productForm.formState.errors.name && (
                <p className="text-[11px] text-destructive">{productForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Product Code</label>
                <Input
                  {...productForm.register('productCode')}
                  placeholder="e.g. INJ-WHT-01"
                  className="text-xs font-mono"
                />
                {productForm.formState.errors.productCode && (
                  <p className="text-[11px] text-destructive">
                    {productForm.formState.errors.productCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Size / Specification</label>
                <Input
                  {...productForm.register('size')}
                  placeholder="e.g. 40cm Diameter"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Unit of Measure</label>
                <select
                  {...productForm.register('unitId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
                {productForm.formState.errors.unitId && (
                  <p className="text-[11px] text-destructive">{productForm.formState.errors.unitId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Selling Price (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...productForm.register('defaultSellingPrice', { valueAsNumber: true })}
                  placeholder="e.g. 25.00"
                  className="text-xs font-mono"
                />
                {productForm.formState.errors.defaultSellingPrice && (
                  <p className="text-[11px] text-destructive">
                    {productForm.formState.errors.defaultSellingPrice.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={productForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {productForm.formState.isSubmitting ? 'Saving…' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Create Recipe (Version 1) */}
      <Dialog open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">New Recipe Formulation (Version 1)</DialogTitle>
            <DialogDescription className="text-xs">
              Define the reference batch size, expected yield, and raw material ingredients.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={recipeForm.handleSubmit(onSubmitRecipe)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Recipe Name</label>
                <Input
                  {...recipeForm.register('name')}
                  placeholder="e.g. Standard Teff Formulation"
                  className="text-xs"
                />
                {recipeForm.formState.errors.name && (
                  <p className="text-[11px] text-destructive">{recipeForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Finished Product</label>
                <select
                  {...recipeForm.register('productId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.productCode}]
                    </option>
                  ))}
                </select>
                {recipeForm.formState.errors.productId && (
                  <p className="text-[11px] text-destructive">
                    {recipeForm.formState.errors.productId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Branch Scope</label>
                <select
                  {...recipeForm.register('branchId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ref Batch Qty (kg)</label>
                <Input
                  type="number"
                  step="any"
                  {...recipeForm.register('referenceBatchQuantity', { valueAsNumber: true })}
                  placeholder="100"
                  className="text-xs font-mono"
                />
                {recipeForm.formState.errors.referenceBatchQuantity && (
                  <p className="text-[11px] text-destructive">
                    {recipeForm.formState.errors.referenceBatchQuantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Expected Yield (pcs)</label>
                <Input
                  type="number"
                  step="any"
                  {...recipeForm.register('expectedYield', { valueAsNumber: true })}
                  placeholder="200"
                  className="text-xs font-mono"
                />
                {recipeForm.formState.errors.expectedYield && (
                  <p className="text-[11px] text-destructive">
                    {recipeForm.formState.errors.expectedYield.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Preparation Instructions (Optional)</label>
              <textarea
                {...recipeForm.register('instructions')}
                placeholder="e.g. Mix teff flour with water; ferment 72 hours; add ersho at hour 48…"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            {/* Ingredients Field Array */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Formulation Ingredients</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    recipeIngredientsArray.append({
                      materialId: '',
                      varietyId: null,
                      unitId: '',
                      expectedQuantity: 1,
                      notes: '',
                    })
                  }
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Ingredient</span>
                </Button>
              </div>

              {recipeIngredientsArray.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                  <div className="col-span-5">
                    <select
                      {...recipeForm.register(`ingredients.${idx}.materialId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">-- Select Material --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <select
                      {...recipeForm.register(`ingredients.${idx}.unitId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">-- Unit --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.symbol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="any"
                      {...recipeForm.register(`ingredients.${idx}.expectedQuantity` as const, {
                        valueAsNumber: true,
                      })}
                      placeholder="Qty"
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {recipeIngredientsArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => recipeIngredientsArray.remove(idx)}
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
                onClick={() => setIsRecipeOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={recipeForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {recipeForm.formState.isSubmitting ? 'Creating Formulation…' : 'Create Recipe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Bump Recipe Version (Immutability Invariant) */}
      <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Bump Recipe Version</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                v{(selectedRecipeForVersion?.currentVersionNumber ?? 0) + 1}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              <strong className="text-foreground">Immutable Versioning Invariant:</strong> Existing versions will never
              be modified or deleted. Past production sessions remain tied to their original version formulation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={versionForm.handleSubmit(onSubmitVersion)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Reference Batch Qty (kg)</label>
                <Input
                  type="number"
                  step="any"
                  {...versionForm.register('referenceBatchQuantity', { valueAsNumber: true })}
                  className="text-xs font-mono"
                />
                {versionForm.formState.errors.referenceBatchQuantity && (
                  <p className="text-[11px] text-destructive">
                    {versionForm.formState.errors.referenceBatchQuantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Expected Yield (pcs)</label>
                <Input
                  type="number"
                  step="any"
                  {...versionForm.register('expectedYield', { valueAsNumber: true })}
                  className="text-xs font-mono"
                />
                {versionForm.formState.errors.expectedYield && (
                  <p className="text-[11px] text-destructive">
                    {versionForm.formState.errors.expectedYield.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Instructions & Revision Notes</label>
              <textarea
                {...versionForm.register('instructions')}
                placeholder="Describe what changed in this version (e.g. Increased hydration ratio, adjusted ersho)…"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            {/* Ingredients Field Array */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Updated Ingredients</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    versionIngredientsArray.append({
                      materialId: '',
                      varietyId: null,
                      unitId: '',
                      expectedQuantity: 1,
                      notes: '',
                    })
                  }
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Ingredient</span>
                </Button>
              </div>

              {versionIngredientsArray.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                  <div className="col-span-5">
                    <select
                      {...versionForm.register(`ingredients.${idx}.materialId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">-- Select Material --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <select
                      {...versionForm.register(`ingredients.${idx}.unitId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">-- Unit --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.symbol}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="any"
                      {...versionForm.register(`ingredients.${idx}.expectedQuantity` as const, {
                        valueAsNumber: true,
                      })}
                      placeholder="Qty"
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {versionIngredientsArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => versionIngredientsArray.remove(idx)}
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
                onClick={() => setIsNewVersionOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={versionForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {versionForm.formState.isSubmitting ? 'Bumping Version…' : 'Save New Version'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: View Recipe Versions & History */}
      <Dialog open={isViewRecipeOpen} onOpenChange={setIsViewRecipeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{detailedRecipe?.name} &bull; Version History</span>
              <span className="text-xs text-muted-foreground font-normal">
                {detailedRecipe?.productName}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immutable version log with ingredient proportions and reference yields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {detailedRecipe?.versions?.map((v: RecipeVersionEntity) => (
              <Card key={v.id} className="border-border/60">
                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      Version {v.versionNumber}
                    </span>
                    {v.effectiveFrom && (
                      <span className="text-[11px] text-muted-foreground">
                        Effective: {new Date(v.effectiveFrom).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-muted-foreground">Ref Batch: </span>
                    <strong className="font-mono">{v.referenceBatchQuantity} kg</strong>
                    <span className="text-muted-foreground ml-3">Yield: </span>
                    <strong className="font-mono text-emerald-600">{v.expectedYield} pcs</strong>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {v.instructions && (
                    <p className="text-xs text-muted-foreground italic mb-2">
                      "{v.instructions}"
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px]">
                        <TableHead className="h-7">Ingredient</TableHead>
                        <TableHead className="h-7 text-right">Quantity</TableHead>
                        <TableHead className="h-7">Unit</TableHead>
                        <TableHead className="h-7">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {v.ingredients?.map((ing) => (
                        <TableRow key={ing.id} className="text-xs">
                          <TableCell className="py-1 font-medium">{ing.materialName}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{ing.expectedQuantity}</TableCell>
                          <TableCell className="py-1 text-muted-foreground">{ing.unitSymbol}</TableCell>
                          <TableCell className="py-1 text-muted-foreground">{ing.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsViewRecipeOpen(false)}
              className="cursor-pointer text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Record Pre-Mix Teff Blend */}
      <Dialog open={isBlendOpen} onOpenChange={setIsBlendOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Record Pre-Mixed Teff Operation</DialogTitle>
            <DialogDescription className="text-xs">
              Combines multiple material lots (e.g., Magna + Sergegna + Qey), deducts input stock, and creates a
              new distinct blend lot with full parent ancestry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={blendForm.handleSubmit(onSubmitBlend)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Baking Station / Branch</label>
                <select
                  {...blendForm.register('branchId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Select Branch --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {blendForm.formState.errors.branchId && (
                  <p className="text-[11px] text-destructive">{blendForm.formState.errors.branchId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Operation Number</label>
                <Input
                  {...blendForm.register('operationNumber')}
                  placeholder="e.g. BLD-202611-001"
                  className="text-xs font-mono"
                />
                {blendForm.formState.errors.operationNumber && (
                  <p className="text-[11px] text-destructive">
                    {blendForm.formState.errors.operationNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Target Mixed Material</label>
                <select
                  {...blendForm.register('targetMaterialId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Select Mixed Teff Material --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {blendForm.formState.errors.targetMaterialId && (
                  <p className="text-[11px] text-destructive">
                    {blendForm.formState.errors.targetMaterialId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Target Unit</label>
                <select
                  {...blendForm.register('targetUnitId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">-- Choose Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
                {blendForm.formState.errors.targetUnitId && (
                  <p className="text-[11px] text-destructive">
                    {blendForm.formState.errors.targetUnitId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Processing Loss (kg)</label>
                <Input
                  type="number"
                  step="any"
                  {...blendForm.register('processingLoss', { valueAsNumber: true })}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Processing Cost (ETB)</label>
                <Input
                  type="number"
                  step="any"
                  {...blendForm.register('processingCost', { valueAsNumber: true })}
                  placeholder="0"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Input Lots Selector */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Source Lots Consumed</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => blendInputsArray.append({ materialLotId: '', quantityConsumed: 0 })}
                  className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Input Lot</span>
                </Button>
              </div>

              {blendInputsArray.fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                  <div className="col-span-7">
                    <select
                      {...blendForm.register(`inputs.${idx}.materialLotId` as const)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-mono"
                    >
                      <option value="">-- Choose Lot --</option>
                      {availableLots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.lotNumber} ({l.materialName} - Avail: {l.remainingQuantity} {l.unitSymbol} @ {Number(l.unitCost).toFixed(2)} ETB)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4">
                    <Input
                      type="number"
                      step="any"
                      {...blendForm.register(`inputs.${idx}.quantityConsumed` as const, {
                        valueAsNumber: true,
                      })}
                      placeholder="Qty to deduct"
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {blendInputsArray.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => blendInputsArray.remove(idx)}
                        className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mass Conservation & Cost Projection Preview */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>Live Formulation & Cost Allocation Preview</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px]">Total Input Qty:</span>
                  <p className="font-mono font-bold">{previewInputQty} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Net Output Qty:</span>
                  <p className="font-mono font-bold text-emerald-600">
                    {previewOutputQty} kg
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Computed Unit Cost:</span>
                  <p className="font-mono font-bold text-primary">
                    {previewUnitCost.toFixed(2)} ETB / kg
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBlendOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={blendForm.formState.isSubmitting}
                className="cursor-pointer text-xs"
              >
                {blendForm.formState.isSubmitting ? 'Recording Blend…' : 'Execute Blend Operation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: View Blend Details & Ancestry */}
      <Dialog open={isViewBlendOpen} onOpenChange={setIsViewBlendOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Blend Ancestry & Cost Allocation</span>
              <span className="text-xs font-mono text-primary">
                {detailedBlend?.operationNumber}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete ancestry tree preserving source lot provenance and unit cost basis.
            </DialogDescription>
          </DialogHeader>

          {detailedBlend && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Output Lot Generated</p>
                  <p className="text-sm font-bold font-mono text-emerald-600">
                    {detailedBlend.output?.lotNumber ?? 'BLEND-LOT'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Quantity: {detailedBlend.outputQuantity} kg
                  </p>
                </Card>

                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">True Unit Cost</p>
                  <p className="text-sm font-bold font-mono">
                    {detailedBlend.output?.unitCost ? Number(detailedBlend.output.unitCost).toFixed(2) : '—'} ETB/kg
                  </p>
                  <p className="text-[10px] text-muted-foreground">allocated from source lots + processing</p>
                </Card>

                <Card className="border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Processing Loss</p>
                  <p className="text-sm font-bold font-mono text-destructive">
                    {detailedBlend.processingLoss} kg
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Cost added: {detailedBlend.processingCost.toFixed(2)} ETB
                  </p>
                </Card>
              </div>

              <Card className="border-border/60">
                <CardHeader className="py-2.5 px-4 bg-muted/30">
                  <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                    <span>Parent Lot Traceability Tree</span>
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead className="h-7">Parent Lot Number</TableHead>
                      <TableHead className="h-7 text-right">Deducted Qty</TableHead>
                      <TableHead className="h-7 text-right">Cost Snapshot</TableHead>
                      <TableHead className="h-7 text-right">Total Allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedBlend.inputs?.map((inp) => (
                      <TableRow key={inp.id} className="text-xs">
                        <TableCell className="py-1.5 font-mono font-medium">{inp.lotNumber}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono">{inp.quantityConsumed} kg</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-muted-foreground">
                          {Number(inp.unitCostSnapshot).toFixed(2)} ETB
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono font-semibold">
                          {Number(inp.totalCost).toFixed(2)} ETB
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
              onClick={() => setIsViewBlendOpen(false)}
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
