import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateQuery } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  createStockLocationSchema,
  updateStockLocationSchema,
  postProductionToStockSchema,
  recordFinishedAdjustmentSchema,
  transferFinishedStockSchema,
  recordRawAdjustmentSchema,
  getFinishedLotsQuerySchema,
  getRawStockQuerySchema,
  type CreateStockLocationInput,
  type UpdateStockLocationInput,
  type PostProductionToStockInput,
  type RecordFinishedAdjustmentInput,
  type TransferFinishedStockInput,
  type RecordRawAdjustmentInput,
} from './inventory.schema.js'

export const inventoryRouter: ExpressRouter = Router()

inventoryRouter.use(authenticate)

// ==========================================
// 1. Stock Locations
// ==========================================

// List stock locations
inventoryRouter.get(
  '/locations',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PRODUCTION_SUPERVISOR', 'INVENTORY_CLERK'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const branchId = req.query.branchId as string | undefined

    const where: { businessId: string; branchId?: string } = { businessId }
    if (branchId) {
      where.branchId = branchId
    }

    const locations = await prisma.stockLocation.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    const branchIds = [...new Set(locations.map((l: { branchId: string }) => l.branchId))]
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    })
    const branchMap = new Map(branches.map((b: { id: string; name: string }) => [b.id, b.name]))

    const data = locations.map((loc: { id: string; businessId: string; branchId: string; name: string; description: string | null; isActive: boolean }) => ({
      ...loc,
      branchName: branchMap.get(loc.branchId) ?? 'Unknown Branch',
    }))

    return res.status(200).json({ data })
  }
)

// Create stock location
inventoryRouter.post(
  '/locations',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createStockLocationSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateStockLocationInput

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, businessId },
    })

    if (!branch) {
      return res.status(404).json({ error: 'BRANCH_NOT_FOUND', message: 'Branch not found.' })
    }

    const existing = await prisma.stockLocation.findFirst({
      where: { branchId: input.branchId, name: input.name },
    })

    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_LOCATION',
        message: 'A stock location with this name already exists at this branch.',
      })
    }

    const location = await prisma.stockLocation.create({
      data: {
        businessId,
        branchId: input.branchId,
        name: input.name,
        description: input.description ?? null,
        isActive: true,
      },
    })

    return res.status(201).json({ data: location })
  }
)

// Update stock location
inventoryRouter.patch(
  '/locations/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(updateStockLocationSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as UpdateStockLocationInput

    const existing = await prisma.stockLocation.findFirst({
      where: { id, businessId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Stock location not found.' })
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.stockLocation.findFirst({
        where: { branchId: existing.branchId, name: input.name, NOT: { id } },
      })
      if (duplicate) {
        return res.status(409).json({
          error: 'DUPLICATE_LOCATION',
          message: 'Another stock location with this name exists in this branch.',
        })
      }
    }

    const updated = await prisma.stockLocation.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    })

    return res.status(200).json({ data: updated })
  }
)

// ==========================================
// 2. Production to Finished Stock Posting
// ==========================================

// Post accepted sellable units from a production batch into finished goods inventory
inventoryRouter.post(
  '/finished-lots/post-production',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PRODUCTION_SUPERVISOR', 'INVENTORY_CLERK'),
  validateBody(postProductionToStockSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as PostProductionToStockInput

    // 1. Verify Production Batch
    const batch = await prisma.productionBatch.findFirst({
      where: { id: input.productionBatchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'BATCH_NOT_FOUND', message: 'Production batch not found.' })
    }

    if (batch.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'BATCH_NOT_COMPLETED',
        message: 'Only completed production batches can be posted to finished inventory.',
      })
    }

    // 2. Prevent duplicate posting of same batch
    const existingLot = await prisma.finishedInventoryLot.findFirst({
      where: { productionBatchId: batch.id, businessId },
    })

    if (existingLot) {
      return res.status(409).json({
        error: 'ALREADY_POSTED',
        message: `This batch has already been posted to finished inventory (Lot ID: ${existingLot.id}).`,
      })
    }

    // 3. Find Output Record
    const output = await prisma.productionOutput.findFirst({
      where: {
        productionBatchId: batch.id,
        businessId,
        ...(input.productionOutputId ? { id: input.productionOutputId } : {}),
      },
    })

    if (!output) {
      return res.status(404).json({
        error: 'NO_OUTPUT_RECORD',
        message: 'No production output record found for this batch.',
      })
    }

    // DOMAIN INVARIANT: Rejected output must not enter sellable finished-goods inventory.
    if (output.acceptedQuantity <= 0) {
      return res.status(400).json({
        error: 'NO_ACCEPTED_UNITS',
        message: 'Cannot post to sellable inventory: Batch has 0 accepted sellable units.',
      })
    }

    // 4. Verify Stock Location
    const location = await prisma.stockLocation.findFirst({
      where: { id: input.stockLocationId, businessId, isActive: true },
    })

    if (!location) {
      return res.status(404).json({
        error: 'LOCATION_NOT_FOUND',
        message: 'Destination stock location not found or inactive.',
      })
    }

    // 5. Determine Unit Cost from Finalized Cost Record if available, else output.unitCost
    const latestCostRecord = await prisma.productionCostRecord.findFirst({
      where: { productionBatchId: batch.id, businessId },
      orderBy: { calculationVersion: 'desc' },
    })

    const unitCost = latestCostRecord?.costPerAcceptedUnit
      ? Number(latestCostRecord.costPerAcceptedUnit)
      : Number(output.unitCost)

    // 6. Expiry Calculation: Freshness window
    const productionDate = batch.endTime
      ? new Date(batch.endTime)
      : batch.finalizedAt
      ? new Date(batch.finalizedAt)
      : new Date()
    const expiryHours = input.expiryHours ?? 72
    const expiryAt = input.customExpiryAt
      ? new Date(input.customExpiryAt)
      : new Date(productionDate.getTime() + expiryHours * 60 * 60 * 1000)

    // 7. Atomic Posting Transaction
    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.finishedInventoryLot.create({
        data: {
          businessId,
          branchId: location.branchId,
          productId: output.productId,
          productionBatchId: batch.id,
          productionOutputId: output.id,
          stockLocationId: location.id,
          productionDate,
          expiryAt,
          originalQuantity: output.acceptedQuantity,
          remainingQuantity: output.acceptedQuantity,
          unitCost,
          status: 'AVAILABLE',
        },
      })

      const movement = await tx.finishedStockMovement.create({
        data: {
          businessId,
          finishedInventoryLotId: lot.id,
          movementType: 'PRODUCTION_IN',
          quantity: output.acceptedQuantity,
          referenceType: 'PRODUCTION_BATCH',
          referenceId: batch.id,
          createdById: userId,
          occurredAt: new Date(),
        },
      })

      return { lot, movement }
    })

    return res.status(201).json({
      message: `Successfully posted ${output.acceptedQuantity} accepted sellable injera into finished stock.`,
      data: result.lot,
    })
  }
)

// ==========================================
// 3. Finished Goods Lots & FIFO Views
// ==========================================

// List finished goods lots
inventoryRouter.get(
  '/finished-lots',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PRODUCTION_SUPERVISOR', 'INVENTORY_CLERK', 'SALES_CASHIER'),
  validateQuery(getFinishedLotsQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const { branchId, productId, stockLocationId, status, fifoOnly } = req.query as {
      branchId?: string
      productId?: string
      stockLocationId?: string
      status?: 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'
      fifoOnly?: string
    }

    const where: {
      businessId: string
      branchId?: string
      productId?: string
      stockLocationId?: string
      status?: 'AVAILABLE' | 'DEPLETED' | 'BLOCKED' | 'EXPIRED'
      remainingQuantity?: { gt: number }
    } = { businessId }

    if (branchId) where.branchId = branchId
    if (productId) where.productId = productId
    if (stockLocationId) where.stockLocationId = stockLocationId
    if (status) {
      where.status = status
    }

    if (fifoOnly === 'true') {
      where.status = 'AVAILABLE'
      where.remainingQuantity = { gt: 0 }
    }

    const lots = await prisma.finishedInventoryLot.findMany({
      where,
      orderBy: { productionDate: 'asc' }, // FIFO default
    })

    // Fetch related metadata: products, locations, batches
    const [products, locations, batches] = await Promise.all([
      prisma.finishedProduct.findMany({
        where: { businessId },
        select: { id: true, name: true, productCode: true, size: true, defaultSellingPrice: true },
      }),
      prisma.stockLocation.findMany({
        where: { businessId },
        select: { id: true, name: true, branchId: true },
      }),
      prisma.productionBatch.findMany({
        where: { businessId, id: { in: lots.map((l: { productionBatchId: string }) => l.productionBatchId) } },
        select: { id: true, batchNumber: true },
      }),
    ])

    const productMap = new Map(products.map((p: { id: string; name: string; productCode: string; size: string | null; defaultSellingPrice: unknown }) => [p.id, p]))
    const locationMap = new Map(locations.map((l: { id: string; name: string; branchId: string }) => [l.id, l]))
    const batchMap = new Map(batches.map((b: { id: string; batchNumber: string }) => [b.id, b.batchNumber]))

    const now = new Date()

    const enrichedLots = lots.map((lot: { id: string; businessId: string; branchId: string; productId: string; productionBatchId: string; productionOutputId: string; stockLocationId: string; productionDate: Date; expiryAt: Date | null; originalQuantity: number; remainingQuantity: number; unitCost: unknown; status: string }, idx: number) => {
      const prod = productMap.get(lot.productId)
      const loc = locationMap.get(lot.stockLocationId)
      const batchNumber = batchMap.get(lot.productionBatchId) ?? 'Unknown Batch'

      const hoursOld = (now.getTime() - new Date(lot.productionDate).getTime()) / (1000 * 60 * 60)
      const hoursToExpiry = lot.expiryAt
        ? (new Date(lot.expiryAt).getTime() - now.getTime()) / (1000 * 60 * 60)
        : null

      const isExpired = hoursToExpiry !== null && hoursToExpiry <= 0
      const isExpiringSoon = hoursToExpiry !== null && hoursToExpiry > 0 && hoursToExpiry <= 12

      return {
        id: lot.id,
        businessId: lot.businessId,
        branchId: lot.branchId,
        productId: lot.productId,
        productName: prod?.name ?? 'Unknown Product',
        productCode: prod?.productCode ?? 'N/A',
        productSize: prod?.size ?? null,
        defaultSellingPrice: prod ? Number(prod.defaultSellingPrice) : 0,
        productionBatchId: lot.productionBatchId,
        batchNumber,
        productionOutputId: lot.productionOutputId,
        stockLocationId: lot.stockLocationId,
        locationName: loc?.name ?? 'Unknown Location',
        productionDate: lot.productionDate,
        expiryAt: lot.expiryAt,
        originalQuantity: lot.originalQuantity,
        remainingQuantity: lot.remainingQuantity,
        unitCost: Number(lot.unitCost),
        totalValuation: Number(lot.unitCost) * lot.remainingQuantity,
        status: isExpired && lot.status === 'AVAILABLE' ? 'EXPIRED' : lot.status,
        hoursOld: Math.round(hoursOld * 10) / 10,
        hoursToExpiry: hoursToExpiry !== null ? Math.round(hoursToExpiry * 10) / 10 : null,
        isExpired,
        isExpiringSoon,
        fifoRank: idx + 1,
      }
    })

    return res.status(200).json({ data: enrichedLots })
  }
)

// Sale-ready stock: FIFO ordered, available, unexpired
inventoryRouter.get(
  '/sale-ready',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PRODUCTION_SUPERVISOR', 'INVENTORY_CLERK', 'SALES_CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const branchId = req.query.branchId as string | undefined
    const productId = req.query.productId as string | undefined

    const where: {
      businessId: string
      branchId?: string
      productId?: string
      status: 'AVAILABLE'
      remainingQuantity: { gt: number }
    } = {
      businessId,
      status: 'AVAILABLE',
      remainingQuantity: { gt: 0 },
    }

    if (branchId) where.branchId = branchId
    if (productId) where.productId = productId

    const lots = await prisma.finishedInventoryLot.findMany({
      where,
      orderBy: { productionDate: 'asc' }, // Strict FIFO rotation
    })

    const [products, locations, batches] = await Promise.all([
      prisma.finishedProduct.findMany({
        where: { businessId },
        select: { id: true, name: true, productCode: true, size: true, defaultSellingPrice: true },
      }),
      prisma.stockLocation.findMany({
        where: { businessId },
        select: { id: true, name: true },
      }),
      prisma.productionBatch.findMany({
        where: { businessId, id: { in: lots.map((l: { productionBatchId: string }) => l.productionBatchId) } },
        select: { id: true, batchNumber: true },
      }),
    ])

    const productMap = new Map(products.map((p: { id: string; name: string; productCode: string; size: string | null; defaultSellingPrice: unknown }) => [p.id, p]))
    const locationMap = new Map(locations.map((l: { id: string; name: string }) => [l.id, l.name]))
    const batchMap = new Map(batches.map((b: { id: string; batchNumber: string }) => [b.id, b.batchNumber]))

    const now = new Date()

    const saleReady = lots.map((lot: { id: string; productId: string; productionBatchId: string; stockLocationId: string; productionDate: Date; expiryAt: Date | null; remainingQuantity: number; unitCost: unknown }, idx: number) => {
      const prod = productMap.get(lot.productId)
      const hoursToExpiry = lot.expiryAt
        ? (new Date(lot.expiryAt).getTime() - now.getTime()) / (1000 * 60 * 60)
        : null

      return {
        id: lot.id,
        productId: lot.productId,
        productName: prod?.name ?? 'Standard Injera',
        productCode: prod?.productCode ?? 'INJ',
        productSize: prod?.size ?? null,
        defaultSellingPrice: prod ? Number(prod.defaultSellingPrice) : 0,
        productionBatchId: lot.productionBatchId,
        batchNumber: batchMap.get(lot.productionBatchId) ?? 'Batch',
        stockLocationId: lot.stockLocationId,
        locationName: locationMap.get(lot.stockLocationId) ?? 'Storage',
        productionDate: lot.productionDate,
        expiryAt: lot.expiryAt,
        remainingQuantity: lot.remainingQuantity,
        unitCost: Number(lot.unitCost),
        hoursToExpiry: hoursToExpiry !== null ? Math.round(hoursToExpiry * 10) / 10 : null,
        isExpiringSoon: hoursToExpiry !== null && hoursToExpiry <= 12 && hoursToExpiry > 0,
        isExpired: hoursToExpiry !== null && hoursToExpiry <= 0,
        fifoSequence: idx + 1,
      }
    })

    return res.status(200).json({ data: saleReady })
  }
)

// ==========================================
// 4. Finished Stock Adjustments, Damage & Spoilage
// ==========================================

inventoryRouter.post(
  '/finished-lots/adjust',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CLERK'),
  validateBody(recordFinishedAdjustmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as RecordFinishedAdjustmentInput

    const lot = await prisma.finishedInventoryLot.findFirst({
      where: { id: input.finishedInventoryLotId, businessId },
    })

    if (!lot) {
      return res.status(404).json({ error: 'LOT_NOT_FOUND', message: 'Finished inventory lot not found.' })
    }

    const isReduction = ['ADJUSTMENT_OUT', 'DAMAGE_OUT', 'SPOILAGE_OUT'].includes(input.movementType)

    // DOMAIN INVARIANT: No negative authoritative online inventory.
    if (isReduction && lot.remainingQuantity < input.quantity) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Cannot deduct ${input.quantity} units. Lot only has ${lot.remainingQuantity} remaining.`,
      })
    }

    const newRemaining = isReduction
      ? lot.remainingQuantity - input.quantity
      : lot.remainingQuantity + input.quantity

    const newStatus =
      newRemaining === 0
        ? 'DEPLETED'
        : lot.status === 'DEPLETED' && newRemaining > 0
        ? 'AVAILABLE'
        : lot.status

    const result = await prisma.$transaction(async (tx) => {
      const updatedLot = await tx.finishedInventoryLot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: newRemaining,
          status: newStatus,
        },
      })

      const movement = await tx.finishedStockMovement.create({
        data: {
          businessId,
          finishedInventoryLotId: lot.id,
          movementType: input.movementType,
          quantity: input.quantity,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: lot.id,
          createdById: userId,
          occurredAt: new Date(),
        },
      })

      return { updatedLot, movement }
    })

    return res.status(200).json({
      message: `Successfully recorded ${input.movementType} of ${input.quantity} units.`,
      data: result.updatedLot,
    })
  }
)

// ==========================================
// 5. Stock Location Transfers
// ==========================================

inventoryRouter.post(
  '/finished-lots/transfer',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CLERK'),
  validateBody(transferFinishedStockSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as TransferFinishedStockInput

    const [sourceLot, targetLocation] = await Promise.all([
      prisma.finishedInventoryLot.findFirst({
        where: { id: input.sourceLotId, businessId },
      }),
      prisma.stockLocation.findFirst({
        where: { id: input.targetStockLocationId, businessId, isActive: true },
      }),
    ])

    if (!sourceLot) {
      return res.status(404).json({ error: 'SOURCE_LOT_NOT_FOUND', message: 'Source lot not found.' })
    }

    if (!targetLocation) {
      return res.status(404).json({
        error: 'TARGET_LOCATION_NOT_FOUND',
        message: 'Destination stock location not found or inactive.',
      })
    }

    if (sourceLot.stockLocationId === targetLocation.id) {
      return res.status(400).json({
        error: 'SAME_LOCATION',
        message: 'Source and destination locations cannot be identical.',
      })
    }

    if (sourceLot.remainingQuantity < input.quantity) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Cannot transfer ${input.quantity} units. Source lot only has ${sourceLot.remainingQuantity} remaining.`,
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement source lot
      const newSourceRemaining = sourceLot.remainingQuantity - input.quantity
      await tx.finishedInventoryLot.update({
        where: { id: sourceLot.id },
        data: {
          remainingQuantity: newSourceRemaining,
          status: newSourceRemaining === 0 ? 'DEPLETED' : sourceLot.status,
        },
      })

      // 2. Record TRANSFER_OUT movement on source lot
      await tx.finishedStockMovement.create({
        data: {
          businessId,
          finishedInventoryLotId: sourceLot.id,
          movementType: 'TRANSFER_OUT',
          quantity: input.quantity,
          referenceType: 'STOCK_TRANSFER',
          referenceId: sourceLot.id,
          createdById: userId,
          occurredAt: new Date(),
        },
      })

      // 3. Create transferred lot at destination
      const destLot = await tx.finishedInventoryLot.create({
        data: {
          businessId,
          branchId: targetLocation.branchId,
          productId: sourceLot.productId,
          productionBatchId: sourceLot.productionBatchId,
          productionOutputId: sourceLot.productionOutputId,
          stockLocationId: targetLocation.id,
          productionDate: sourceLot.productionDate,
          expiryAt: sourceLot.expiryAt,
          originalQuantity: input.quantity,
          remainingQuantity: input.quantity,
          unitCost: sourceLot.unitCost,
          status: 'AVAILABLE',
        },
      })

      // 4. Record TRANSFER_IN movement on destination lot
      await tx.finishedStockMovement.create({
        data: {
          businessId,
          finishedInventoryLotId: destLot.id,
          movementType: 'TRANSFER_IN',
          quantity: input.quantity,
          referenceType: 'STOCK_TRANSFER',
          referenceId: sourceLot.id,
          createdById: userId,
          occurredAt: new Date(),
        },
      })

      return { destLot }
    })

    return res.status(200).json({
      message: `Successfully transferred ${input.quantity} units to ${targetLocation.name}.`,
      data: result.destLot,
    })
  }
)

// ==========================================
// 6. Raw Material Stock Views, Valuation & Adjustments
// ==========================================

// Raw Material Stock Valuation and Minimum Stock Check
inventoryRouter.get(
  '/raw-stock',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PRODUCTION_SUPERVISOR', 'INVENTORY_CLERK'),
  validateQuery(getRawStockQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const { branchId, materialId, lowStockOnly } = req.query as {
      branchId?: string
      materialId?: string
      lowStockOnly?: string
    }

    const [materials, categories, units, lots] = await Promise.all([
      prisma.material.findMany({
        where: { businessId, isActive: true, ...(materialId ? { id: materialId } : {}) },
      }),
      prisma.materialCategory.findMany({ where: { businessId } }),
      prisma.unitOfMeasure.findMany({ where: { businessId } }),
      prisma.materialLot.findMany({
        where: {
          businessId,
          status: 'AVAILABLE',
          remainingQuantity: { gt: 0 },
          ...(branchId ? { branchId } : {}),
          ...(materialId ? { materialId } : {}),
        },
        orderBy: { receivedAt: 'asc' }, // FIFO lots
      }),
    ])

    const catMap = new Map(categories.map((c: { id: string; name: string }) => [c.id, c.name]))
    const unitMap = new Map(units.map((u: { id: string; symbol: string }) => [u.id, u.symbol]))

    // Group lots by material
    const lotsByMaterial = new Map<string, typeof lots>()
    for (const lot of lots) {
      const list = lotsByMaterial.get(lot.materialId) ?? []
      list.push(lot)
      lotsByMaterial.set(lot.materialId, list)
    }

    let summary = materials.map((m: { id: string; name: string; categoryId: string; defaultUnitId: string; minimumStock: unknown }) => {
      const materialLots = lotsByMaterial.get(m.id) ?? []
      const totalRemaining = materialLots.reduce((acc: number, l: { remainingQuantity: unknown }) => acc + Number(l.remainingQuantity), 0)
      const totalValuation = materialLots.reduce(
        (acc: number, l: { remainingQuantity: unknown; unitCost: unknown }) => acc + Number(l.remainingQuantity) * Number(l.unitCost),
        0
      )
      const avgUnitCost = totalRemaining > 0 ? totalValuation / totalRemaining : 0
      const minStock = Number(m.minimumStock)
      const isLowStock = totalRemaining <= minStock

      return {
        materialId: m.id,
        materialName: m.name,
        categoryName: catMap.get(m.categoryId) ?? 'General',
        unit: unitMap.get(m.defaultUnitId) ?? 'kg',
        minimumStock: minStock,
        totalRemainingQuantity: Math.round(totalRemaining * 1000) / 1000,
        totalStockValuation: Math.round(totalValuation * 100) / 100,
        averageUnitCost: Math.round(avgUnitCost * 100) / 100,
        isLowStock,
        activeLotsCount: materialLots.length,
        lots: materialLots.map((l: { id: string; lotNumber: string; remainingQuantity: unknown; unitCost: unknown; receivedAt: Date; expiryDate: Date | null }) => ({
          id: l.id,
          lotNumber: l.lotNumber,
          remainingQuantity: Number(l.remainingQuantity),
          unitCost: Number(l.unitCost),
          totalCost: Number(l.remainingQuantity) * Number(l.unitCost),
          receivedAt: l.receivedAt,
          expiryDate: l.expiryDate,
        })),
      }
    })

    if (lowStockOnly === 'true') {
      summary = summary.filter((s: { isLowStock: boolean }) => s.isLowStock)
    }

    return res.status(200).json({ data: summary })
  }
)

// Raw Material Stock Adjustment (Damage / Spoilage / Stock count)
inventoryRouter.post(
  '/raw-stock/adjust',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CLERK'),
  validateBody(recordRawAdjustmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as RecordRawAdjustmentInput

    const lot = await prisma.materialLot.findFirst({
      where: { id: input.materialLotId, businessId },
    })

    if (!lot) {
      return res.status(404).json({ error: 'LOT_NOT_FOUND', message: 'Material lot not found.' })
    }

    const isReduction = input.movementType === 'ADJUSTMENT_OUT'
    const currentRemaining = Number(lot.remainingQuantity)

    // DOMAIN INVARIANT: No negative raw stock
    if (isReduction && currentRemaining < input.quantity) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Cannot deduct ${input.quantity}. Lot only has ${currentRemaining} remaining.`,
      })
    }

    const newRemaining = isReduction
      ? currentRemaining - input.quantity
      : currentRemaining + input.quantity

    const newStatus =
      newRemaining <= 0
        ? 'DEPLETED'
        : lot.status === 'DEPLETED' && newRemaining > 0
        ? 'AVAILABLE'
        : lot.status

    const result = await prisma.$transaction(async (tx) => {
      const updatedLot = await tx.materialLot.update({
        where: { id: lot.id },
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
          totalCost: Number(lot.unitCost) * input.quantity,
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: lot.id,
          createdById: userId,
          occurredAt: new Date(),
        },
      })

      return { updatedLot, movement }
    })

    return res.status(200).json({
      message: `Recorded ${input.movementType} of ${input.quantity} on lot ${lot.lotNumber}.`,
      data: result.updatedLot,
    })
  }
)

// ==========================================
// 7. Movement-Based Audit Reconciliation
// ==========================================

inventoryRouter.get(
  '/finished-lots/:id/reconciliation',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CLERK'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string

    const lot = await prisma.finishedInventoryLot.findFirst({
      where: { id, businessId },
    })

    if (!lot) {
      return res.status(404).json({ error: 'LOT_NOT_FOUND', message: 'Finished inventory lot not found.' })
    }

    const movements = await prisma.finishedStockMovement.findMany({
      where: { finishedInventoryLotId: id, businessId },
      orderBy: { occurredAt: 'asc' },
    })

    // Calculate sum of IN and OUT movements
    let totalIn = 0
    let totalOut = 0

    for (const m of movements) {
      if (['PRODUCTION_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'REVERSAL'].includes(m.movementType)) {
        totalIn += m.quantity
      } else if (['SALE_OUT', 'DAMAGE_OUT', 'SPOILAGE_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT'].includes(m.movementType)) {
        totalOut += m.quantity
      }
    }

    const calculatedBalance = totalIn - totalOut
    const reconciles = lot.remainingQuantity === calculatedBalance

    return res.status(200).json({
      data: {
        lotId: lot.id,
        originalQuantity: lot.originalQuantity,
        remainingQuantity: lot.remainingQuantity,
        totalIn,
        totalOut,
        calculatedBalance,
        reconciles,
        movements: movements.map((m: { id: string; movementType: string; quantity: number; referenceType: string; referenceId: string; occurredAt: Date }) => ({
          id: m.id,
          movementType: m.movementType,
          quantity: m.quantity,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          occurredAt: m.occurredAt,
        })),
      },
    })
  }
)
