import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  adjustLotSchema,
  convertUnitSchema,
  createCategorySchema,
  createMaterialSchema,
  createPurchaseSchema,
  createSupplierSchema,
  createUnitSchema,
  createVarietySchema,
  updateMaterialSchema,
  type AdjustLotInput,
  type ConvertUnitInput,
  type CreateCategoryInput,
  type CreateMaterialInput,
  type CreatePurchaseInput,
  type CreateSupplierInput,
  type CreateUnitInput,
  type CreateVarietyInput,
  type UpdateMaterialInput,
} from './materials.schema.js'

export const materialsRouter: ExpressRouter = Router()

// All material operations require authenticated identity
materialsRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Material Categories
 * -------------------------------------------------------------
 */

// List categories
materialsRouter.get('/categories', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const categories = await prisma.materialCategory.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return res.json({ data: categories })
})

// Create category
materialsRouter.post(
  '/categories',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateCategoryInput

    const existing = await prisma.materialCategory.findUnique({
      where: { businessId_name: { businessId, name: input.name } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A category with this name already exists.' })
    }

    const category = await prisma.materialCategory.create({
      data: {
        businessId,
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
    })

    return res.status(201).json({ data: category })
  }
)

/**
 * -------------------------------------------------------------
 * Units of Measure & Conversions
 * -------------------------------------------------------------
 */

// List units of measure
materialsRouter.get('/units', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const units = await prisma.unitOfMeasure.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
  return res.json({ data: units })
})

// Create unit of measure
materialsRouter.post(
  '/units',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createUnitSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateUnitInput

    const existing = await prisma.unitOfMeasure.findUnique({
      where: { businessId_symbol: { businessId, symbol: input.symbol } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A unit with this symbol already exists.' })
    }

    const unit = await prisma.unitOfMeasure.create({
      data: {
        businessId,
        name: input.name,
        symbol: input.symbol,
        dimension: input.dimension,
        isBaseUnit: input.isBaseUnit ?? false,
      },
    })

    return res.status(201).json({ data: unit })
  }
)

// Explicit unit conversion
materialsRouter.post(
  '/units/convert',
  validateBody(convertUnitSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as ConvertUnitInput

    const [fromUnit, toUnit] = await Promise.all([
      prisma.unitOfMeasure.findFirst({ where: { id: input.fromUnitId, businessId } }),
      prisma.unitOfMeasure.findFirst({ where: { id: input.toUnitId, businessId } }),
    ])

    if (!fromUnit || !toUnit) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'One or both units of measure were not found.' })
    }

    // Invariant: Do not convert mass to volume (or vice versa) without explicit factor
    if (fromUnit.dimension !== toUnit.dimension) {
      return res.status(400).json({
        error: 'DIMENSIONAL_MISMATCH',
        message: `Cross-dimensional unit conversion between ${fromUnit.dimension} (${fromUnit.symbol}) and ${toUnit.dimension} (${toUnit.symbol}) is not allowed without an explicit material ratio.`,
      })
    }

    // Calculate conversion factor within same dimension
    let factor = 1
    const fromSym = fromUnit.symbol.toLowerCase()
    const toSym = toUnit.symbol.toLowerCase()

    if (fromSym === toSym) {
      factor = 1
    } else if (fromSym === 'kg' && toSym === 'g') {
      factor = 1000
    } else if (fromSym === 'g' && toSym === 'kg') {
      factor = 0.001
    } else if (fromSym === 'l' && toSym === 'ml') {
      factor = 1000
    } else if (fromSym === 'ml' && toSym === 'l') {
      factor = 0.001
    } else {
      // Default identity if non-standard custom ratio not registered
      factor = 1
    }

    const convertedQuantity = Number((input.quantity * factor).toFixed(4))

    return res.json({
      data: {
        fromUnit,
        toUnit,
        originalQuantity: input.quantity,
        convertedQuantity,
        conversionRatio: factor,
      },
    })
  }
)

/**
 * -------------------------------------------------------------
 * Materials & Varieties Catalog
 * -------------------------------------------------------------
 */

// List materials with active lot balances and category/unit metadata
materialsRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const [materials, categories, units, lots] = await Promise.all([
    prisma.material.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.materialCategory.findMany({ where: { businessId } }),
    prisma.unitOfMeasure.findMany({ where: { businessId } }),
    prisma.materialLot.findMany({
      where: { businessId, status: 'AVAILABLE' },
      select: { materialId: true, remainingQuantity: true },
    }),
  ])

  // Aggregate available lot stock per material
  const stockByMaterial = new Map<string, number>()
  for (const lot of lots) {
    const current = stockByMaterial.get(lot.materialId) ?? 0
    stockByMaterial.set(lot.materialId, current + Number(lot.remainingQuantity))
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))

  const enriched = materials.map((m) => {
    const currentStock = stockByMaterial.get(m.id) ?? 0
    const minStock = Number(m.minimumStock)
    const isLowStock = currentStock <= minStock
    return {
      ...m,
      minimumStock: minStock,
      categoryName: categoryMap.get(m.categoryId) ?? 'Unknown',
      defaultUnitSymbol: unitMap.get(m.defaultUnitId) ?? 'unit',
      currentStock,
      isLowStock,
    }
  })

  return res.json({ data: enriched })
})

// Low-stock alert endpoint
materialsRouter.get('/low-stock', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const [materials, units, lots] = await Promise.all([
    prisma.material.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.unitOfMeasure.findMany({ where: { businessId } }),
    prisma.materialLot.findMany({
      where: { businessId, status: 'AVAILABLE' },
      select: { materialId: true, remainingQuantity: true },
    }),
  ])

  const stockByMaterial = new Map<string, number>()
  for (const lot of lots) {
    const current = stockByMaterial.get(lot.materialId) ?? 0
    stockByMaterial.set(lot.materialId, current + Number(lot.remainingQuantity))
  }

  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))

  const lowStockItems = materials
    .map((m) => {
      const currentStock = stockByMaterial.get(m.id) ?? 0
      const minStock = Number(m.minimumStock)
      return {
        ...m,
        minimumStock: minStock,
        defaultUnitSymbol: unitMap.get(m.defaultUnitId) ?? 'unit',
        currentStock,
        isLowStock: currentStock <= minStock,
      }
    })
    .filter((m) => m.isLowStock)

  return res.json({
    data: lowStockItems,
    summary: {
      totalLowStockCount: lowStockItems.length,
    },
  })
})

// Create material
materialsRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createMaterialSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateMaterialInput

    const existing = await prisma.material.findUnique({
      where: { businessId_name: { businessId, name: input.name } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A material with this name already exists.' })
    }

    const material = await prisma.material.create({
      data: {
        businessId,
        categoryId: input.categoryId,
        name: input.name,
        defaultUnitId: input.defaultUnitId,
        minimumStock: input.minimumStock,
        isActive: input.isActive ?? true,
      },
    })

    return res.status(201).json({ data: material })
  }
)



/**
 * -------------------------------------------------------------
 * Suppliers
 * -------------------------------------------------------------
 */

// List suppliers
materialsRouter.get('/suppliers', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const suppliers = await prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })
  return res.json({ data: suppliers })
})

// Create supplier
materialsRouter.post(
  '/suppliers',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createSupplierSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateSupplierInput

    const supplier = await prisma.supplier.create({
      data: {
        businessId,
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        contactPerson: input.contactPerson ?? null,
        status: input.status ?? 'ACTIVE',
      },
    })

    return res.status(201).json({ data: supplier })
  }
)

/**
 * -------------------------------------------------------------
 * Purchases & Usable Weight Invariants
 * -------------------------------------------------------------
 */

// List purchases
materialsRouter.get('/purchases', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const purchases = await prisma.purchase.findMany({
    where: { businessId },
    orderBy: { purchaseDate: 'desc' },
  })

  const purchaseIds = purchases.map((p) => p.id)
  const items = await prisma.purchaseItem.findMany({
    where: { purchaseId: { in: purchaseIds }, businessId },
  })

  const itemsByPurchase = new Map<string, typeof items>()
  for (const item of items) {
    const arr = itemsByPurchase.get(item.purchaseId) ?? []
    arr.push(item)
    itemsByPurchase.set(item.purchaseId, arr)
  }

  const enriched = purchases.map((p) => ({
    ...p,
    items: itemsByPurchase.get(p.id) ?? [],
  }))

  return res.json({ data: enriched })
})

// Get single purchase with items
materialsRouter.get('/purchases/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const purchase = await prisma.purchase.findFirst({
    where: { id, businessId },
  })

  if (!purchase) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Purchase not found.' })
  }

  const items = await prisma.purchaseItem.findMany({
    where: { purchaseId: id, businessId },
  })

  return res.json({ data: { ...purchase, items } })
})

// Create purchase with Gross, Tare, and Unusable weight calculations
materialsRouter.post(
  '/purchases',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createPurchaseSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as CreatePurchaseInput

    // Verify unique purchase number
    const existing = await prisma.purchase.findUnique({
      where: { businessId_purchaseNumber: { businessId, purchaseNumber: input.purchaseNumber } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A purchase with this purchase number already exists.' })
    }

    // 1. Calculate usable weight for each item & validate usable weight > 0
    // Equation: usable_weight = gross_weight - tare_weight - unusable_weight
    for (let idx = 0; idx < input.items.length; idx++) {
      const it = input.items[idx]
      if (!it) continue
      const gross = it.grossQuantity
      const tare = it.tareQuantity ?? 0
      const unusable = it.unusableQuantity ?? 0
      const usable = gross - tare - unusable

      if (usable <= 0) {
        return res.status(400).json({
          error: 'INVALID_USABLE_WEIGHT',
          message: `Item ${idx + 1}: Usable weight must be greater than zero. Received: gross (${gross}) - tare (${tare}) - unusable (${unusable}) = ${usable}`,
        })
      }
    }

    let totalItemsPurchaseCost = 0
    const calculatedItems = input.items.map((item) => {
      const gross = item.grossQuantity
      const tare = item.tareQuantity ?? 0
      const unusable = item.unusableQuantity ?? 0
      const usable = gross - tare - unusable

      totalItemsPurchaseCost += item.purchaseCost
      return {
        ...item,
        grossQuantity: gross,
        tareQuantity: tare,
        unusableQuantity: unusable,
        usableQuantity: usable,
      }
    })

    const totalAcquisitionOverhead = input.acquisitionCost ?? 0
    const totalAmount = totalItemsPurchaseCost + totalAcquisitionOverhead

    // 2. Allocate acquisition costs and calculate unit cost
    // Equation: unit_cost = (purchase_cost + allocated_acquisition_cost) / usable_weight
    const itemsWithAllocations = calculatedItems.map((item) => {
      let allocatedAcquisition = 0
      if (totalAcquisitionOverhead > 0) {
        if (totalItemsPurchaseCost > 0) {
          allocatedAcquisition = Number(
            ((item.purchaseCost / totalItemsPurchaseCost) * totalAcquisitionOverhead).toFixed(4)
          )
        } else {
          allocatedAcquisition = Number(
            (totalAcquisitionOverhead / calculatedItems.length).toFixed(4)
          )
        }
      }

      const totalItemCost = item.purchaseCost + allocatedAcquisition
      const unitCost = Number((totalItemCost / item.usableQuantity).toFixed(4))

      return {
        ...item,
        allocatedAcquisitionCost: allocatedAcquisition,
        unitCost,
      }
    })

    // Execute in transaction
    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          businessId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseNumber: input.purchaseNumber,
          purchaseDate: new Date(input.purchaseDate),
          totalAmount,
          acquisitionCost: totalAcquisitionOverhead,
          paymentStatus: input.paymentStatus ?? 'UNPAID',
          status: input.receiveImmediately ? 'RECEIVED' : 'DRAFT',
          createdById: userId,
        },
      })

      const createdItems = []
      for (const [i, item] of itemsWithAllocations.entries()) {
        const createdItem = await tx.purchaseItem.create({
          data: {
            businessId,
            purchaseId: createdPurchase.id,
            materialId: item.materialId,
            varietyId: item.varietyId ?? null,
            grossQuantity: item.grossQuantity,
            tareQuantity: item.tareQuantity,
            unusableQuantity: item.unusableQuantity,
            usableQuantity: item.usableQuantity,
            unitId: item.unitId,
            purchaseCost: item.purchaseCost,
            allocatedAcquisitionCost: item.allocatedAcquisitionCost,
            unitCost: item.unitCost,
          },
        })
        createdItems.push(createdItem)

        // If receiveImmediately is enabled, create distinct material lot immediately
        if (input.receiveImmediately) {
          const lotNumber = `LOT-${input.purchaseNumber}-${i + 1}`
          const lot = await tx.materialLot.create({
            data: {
              businessId,
              branchId: input.branchId,
              materialId: item.materialId,
              varietyId: item.varietyId ?? null,
              purchaseItemId: createdItem.id,
              lotNumber,
              originalQuantity: item.usableQuantity,
              remainingQuantity: item.usableQuantity,
              unitId: item.unitId,
              totalAcquisitionCost: item.purchaseCost + item.allocatedAcquisitionCost,
              unitCost: item.unitCost,
              receivedAt: new Date(input.purchaseDate),
              status: 'AVAILABLE',
            },
          })

          await tx.materialLotMovement.create({
            data: {
              businessId,
              materialLotId: lot.id,
              movementType: 'PURCHASE_RECEIPT',
              quantity: item.usableQuantity,
              unitCostSnapshot: item.unitCost,
              totalCost: item.purchaseCost + item.allocatedAcquisitionCost,
              referenceType: 'PURCHASE',
              referenceId: createdPurchase.id,
              createdById: userId,
            },
          })
        }
      }

      return {
        ...createdPurchase,
        items: createdItems,
      }
    })

    return res.status(201).json({ data: purchase })
  }
)

// Receive a draft purchase: creates distinct MaterialLot records and initial movements
materialsRouter.post(
  '/purchases/:id/receive',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const id = req.params.id as string

    const purchase = await prisma.purchase.findFirst({
      where: { id, businessId },
    })

    if (!purchase) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Purchase not found.' })
    }

    if (purchase.status === 'RECEIVED') {
      return res.status(400).json({ error: 'ALREADY_RECEIVED', message: 'This purchase has already been received.' })
    }

    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId: id, businessId },
    })

    if (items.length === 0) {
      return res.status(400).json({ error: 'NO_ITEMS', message: 'Purchase has no items to receive.' })
    }

    const receivedLots = await prisma.$transaction(async (tx) => {
      const lots = []
      for (const [i, item] of items.entries()) {
        const lotNumber = `LOT-${purchase.purchaseNumber}-${i + 1}`

        const lot = await tx.materialLot.create({
          data: {
            businessId,
            branchId: purchase.branchId,
            materialId: item.materialId,
            varietyId: item.varietyId,
            purchaseItemId: item.id,
            lotNumber,
            originalQuantity: item.usableQuantity,
            remainingQuantity: item.usableQuantity,
            unitId: item.unitId,
            totalAcquisitionCost: Number(item.purchaseCost) + Number(item.allocatedAcquisitionCost),
            unitCost: item.unitCost,
            receivedAt: new Date(),
            status: 'AVAILABLE',
          },
        })

        await tx.materialLotMovement.create({
          data: {
            businessId,
            materialLotId: lot.id,
            movementType: 'PURCHASE_RECEIPT',
            quantity: item.usableQuantity,
            unitCostSnapshot: item.unitCost,
            totalCost: Number(item.purchaseCost) + Number(item.allocatedAcquisitionCost),
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            createdById: userId,
          },
        })

        lots.push(lot)
      }

      await tx.purchase.update({
        where: { id },
        data: { status: 'RECEIVED' },
      })

      return lots
    })

    return res.json({
      message: 'Purchase received successfully. Material lots created.',
      data: {
        purchaseId: id,
        status: 'RECEIVED',
        createdLots: receivedLots,
      },
    })
  }
)

/**
 * -------------------------------------------------------------
 * Material Lots & Stock Movements
 * -------------------------------------------------------------
 */

// List lots with filtering and material metadata
materialsRouter.get('/lots', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const materialId = req.query.materialId as string | undefined
  const status = req.query.status as string | undefined

  const whereClause: {
    businessId: string
    materialId?: string
    status?: 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'
  } = { businessId }

  if (materialId) whereClause.materialId = materialId
  if (status) whereClause.status = status as 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'

  const [lots, materials, units, branches, varieties] = await Promise.all([
    prisma.materialLot.findMany({
      where: whereClause,
      orderBy: { receivedAt: 'desc' },
    }),
    prisma.material.findMany({ where: { businessId } }),
    prisma.unitOfMeasure.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
    prisma.materialVariety.findMany({ where: { businessId } }),
  ])

  const matMap = new Map(materials.map((m) => [m.id, m.name]))
  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const varMap = new Map(varieties.map((v) => [v.id, v.name]))

  const enriched = lots.map((l) => ({
    ...l,
    materialName: matMap.get(l.materialId) ?? 'Unknown Material',
    unitSymbol: unitMap.get(l.unitId) ?? 'unit',
    branchName: branchMap.get(l.branchId) ?? 'Unknown Branch',
    varietyName: l.varietyId ? (varMap.get(l.varietyId) ?? null) : null,
  }))

  return res.json({ data: enriched })
})

// Get movements for a specific lot
materialsRouter.get('/lots/:id/movements', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const lot = await prisma.materialLot.findFirst({
    where: { id, businessId },
  })

  if (!lot) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Material lot not found.' })
  }

  const movements = await prisma.materialLotMovement.findMany({
    where: { materialLotId: id, businessId },
    orderBy: { occurredAt: 'desc' },
  })

  return res.json({
    data: {
      lot,
      movements,
    },
  })
})

// Adjust lot stock (consumption, adjustment in/out) with over-consumption rejection
materialsRouter.post(
  '/lots/:id/adjust',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(adjustLotSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const id = req.params.id as string
    const input = req.body as AdjustLotInput

    const lot = await prisma.materialLot.findFirst({
      where: { id, businessId },
    })

    if (!lot) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Material lot not found.' })
    }

    const currentRemaining = Number(lot.remainingQuantity)

    // Handle reduction vs addition
    const isReduction = input.movementType === 'ADJUSTMENT_OUT' || input.movementType === 'PRODUCTION_CONSUMPTION'

    if (isReduction && currentRemaining < input.quantity) {
      // Invariant: Prevent consumption beyond available authoritative lot stock
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Cannot deduct ${input.quantity} from lot ${lot.lotNumber}. Available balance is only ${currentRemaining}.`,
      })
    }

    const newRemaining = isReduction
      ? Number((currentRemaining - input.quantity).toFixed(4))
      : Number((currentRemaining + input.quantity).toFixed(4))

    const newStatus = newRemaining === 0 ? 'DEPLETED' : 'AVAILABLE'
    const totalCost = Number((input.quantity * Number(lot.unitCost)).toFixed(4))

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLot = await tx.materialLot.update({
        where: { id },
        data: {
          remainingQuantity: newRemaining,
          status: newStatus,
        },
      })

      const movement = await tx.materialLotMovement.create({
        data: {
          businessId,
          materialLotId: lot.id,
          movementType: input.movementType,
          quantity: input.quantity,
          unitCostSnapshot: lot.unitCost,
          totalCost,
          referenceType: input.referenceType ?? 'MANUAL_ADJUSTMENT',
          referenceId: lot.id,
          createdById: userId,
        },
      })

      return { lot: updatedLot, movement }
    })

    return res.json({
      message: 'Stock adjustment recorded successfully',
      data: updated,
    })
  }
)

/**
 * -------------------------------------------------------------
 * Single Material Operations & Varieties (Parameterized Routes)
 * -------------------------------------------------------------
 */

// Get single material with varieties
materialsRouter.get('/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const material = await prisma.material.findFirst({
    where: { id, businessId },
  })

  if (!material) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Material not found.' })
  }

  const [varieties, lots] = await Promise.all([
    prisma.materialVariety.findMany({ where: { materialId: id, businessId } }),
    prisma.materialLot.findMany({
      where: { materialId: id, businessId, status: 'AVAILABLE' },
      orderBy: { receivedAt: 'desc' },
    }),
  ])

  const currentStock = lots.reduce((acc, l) => acc + Number(l.remainingQuantity), 0)

  return res.json({
    data: {
      ...material,
      currentStock,
      isLowStock: currentStock <= Number(material.minimumStock),
      varieties,
      activeLots: lots,
    },
  })
})

// Update material
materialsRouter.patch(
  '/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(updateMaterialSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as UpdateMaterialInput

    const existing = await prisma.material.findFirst({
      where: { id, businessId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Material not found.' })
    }

    const updated = await prisma.material.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.defaultUnitId !== undefined && { defaultUnitId: input.defaultUnitId }),
        ...(input.minimumStock !== undefined && { minimumStock: input.minimumStock }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    })

    return res.json({ data: updated })
  }
)

// List varieties for a material
materialsRouter.get('/:id/varieties', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const materialId = req.params.id as string

  const varieties = await prisma.materialVariety.findMany({
    where: { materialId, businessId, isActive: true },
    orderBy: { name: 'asc' },
  })

  return res.json({ data: varieties })
})

// Create variety for a material (e.g. Magna, Sergegna for Teff)
materialsRouter.post(
  '/:id/varieties',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createVarietySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const materialId = req.params.id as string
    const input = req.body as CreateVarietyInput

    const material = await prisma.material.findFirst({
      where: { id: materialId, businessId },
    })

    if (!material) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Material not found.' })
    }

    const existing = await prisma.materialVariety.findUnique({
      where: { materialId_name: { materialId, name: input.name } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A variety with this name already exists for this material.' })
    }

    const variety = await prisma.materialVariety.create({
      data: {
        businessId,
        materialId,
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
      },
    })

    return res.status(201).json({ data: variety })
  }
)
