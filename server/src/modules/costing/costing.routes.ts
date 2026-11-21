import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  createEmployeeCompensationSchema,
  createOverheadRecordSchema,
  allocateOverheadSchema,
  createLabourCostRecordSchema,
  allocateLabourCostSchema,
  type CreateEmployeeCompensationInput,
  type CreateOverheadRecordInput,
  type AllocateOverheadInput,
  type CreateLabourCostRecordInput,
  type AllocateLabourCostInput,
} from './costing.schema.js'

export const costingRouter: ExpressRouter = Router()

// All costing routes require authenticated identity
costingRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Reports
 * -------------------------------------------------------------
 */

// Unit cost trends report
costingRouter.get('/reports/unit-cost-trends', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const costRecords = await prisma.productionCostRecord.findMany({
    where: { businessId, finalizedAt: { not: null } },
    orderBy: { calculatedAt: 'desc' },
  })

  const batchIds = costRecords.map((c) => c.productionBatchId)
  const [batches, outputs, products] = await Promise.all([
    prisma.productionBatch.findMany({ where: { id: { in: batchIds }, businessId } }),
    prisma.productionOutput.findMany({ where: { productionBatchId: { in: batchIds }, businessId } }),
    prisma.finishedProduct.findMany({ where: { businessId } }),
  ])

  const batchMap = new Map(batches.map((b) => [b.id, b]))
  const productMap = new Map(products.map((p) => [p.id, p]))

  const outputsByBatch = new Map<string, typeof outputs>()
  for (const out of outputs) {
    const arr = outputsByBatch.get(out.productionBatchId) ?? []
    arr.push(out)
    outputsByBatch.set(out.productionBatchId, arr)
  }

  const trends = costRecords.map((cr) => {
    const batch = batchMap.get(cr.productionBatchId)
    const batchOutputs = outputsByBatch.get(cr.productionBatchId) ?? []
    const firstOutput = batchOutputs[0]
    const product = firstOutput ? productMap.get(firstOutput.productId) : undefined

    return {
      costRecordId: cr.id,
      batchId: cr.productionBatchId,
      batchNumber: batch?.batchNumber ?? 'Unknown Batch',
      productId: product?.id,
      productName: product?.name ?? 'Standard Product',
      materialCost: Number(cr.materialCost),
      directOverheadCost: Number(cr.directOverheadCost),
      allocatedDailyOverhead: Number(cr.allocatedDailyOverhead),
      allocatedLabourCost: Number(cr.allocatedLabourCost),
      totalBatchCost: Number(cr.totalBatchCost),
      acceptedQuantity: cr.acceptedQuantity,
      costPerAcceptedUnit: cr.costPerAcceptedUnit ? Number(cr.costPerAcceptedUnit) : null,
      finalizedAt: cr.finalizedAt,
    }
  })

  return res.json({ data: trends })
})

/**
 * -------------------------------------------------------------
 * Employee Compensation (Effective-Dated)
 * -------------------------------------------------------------
 */

// List compensations for an employee
costingRouter.get('/compensations/:employeeId', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const employeeId = req.params.employeeId as string

  const compensations = await prisma.employeeCompensation.findMany({
    where: { employeeId, businessId },
    orderBy: { effectiveFrom: 'desc' },
  })

  return res.json({ data: compensations })
})

// Record effective-dated compensation
costingRouter.post(
  '/compensations',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createEmployeeCompensationSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateEmployeeCompensationInput

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found.' })
    }

    const compensation = await prisma.employeeCompensation.create({
      data: {
        businessId,
        employeeId: input.employeeId,
        compensationType: input.compensationType,
        rate: input.rate,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      },
    })

    return res.status(201).json({ data: compensation })
  }
)

/**
 * -------------------------------------------------------------
 * Overhead Records & Daily Allocations
 * -------------------------------------------------------------
 */

// List overhead records
costingRouter.get('/overheads', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { branchId, operationalDate, allocationType, productionBatchId } = req.query as {
    branchId?: string
    operationalDate?: string
    allocationType?: string
    productionBatchId?: string
  }

  const whereClause: Record<string, unknown> = { businessId }
  if (branchId) whereClause.branchId = branchId
  if (operationalDate) whereClause.operationalDate = new Date(operationalDate)
  if (allocationType) whereClause.allocationType = allocationType
  if (productionBatchId) whereClause.productionBatchId = productionBatchId

  const [overheads, allocations, branches, batches] = await Promise.all([
    prisma.overheadRecord.findMany({
      where: whereClause,
      orderBy: { operationalDate: 'desc' },
    }),
    prisma.overheadAllocation.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
    prisma.productionBatch.findMany({ where: { businessId } }),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const batchMap = new Map(batches.map((b) => [b.id, b.batchNumber]))

  const allocatedMap = new Map<string, number>()
  for (const alloc of allocations) {
    const sum = allocatedMap.get(alloc.overheadRecordId) ?? 0
    allocatedMap.set(alloc.overheadRecordId, sum + Number(alloc.allocatedAmount))
  }

  const enriched = overheads.map((o) => {
    const totalAmount = Number(o.amount)
    const allocated = Number((allocatedMap.get(o.id) ?? 0).toFixed(4))
    const unallocated = Number(Math.max(0, totalAmount - allocated).toFixed(4))
    return {
      ...o,
      branchName: branchMap.get(o.branchId) ?? 'Unknown Branch',
      batchNumber: o.productionBatchId ? (batchMap.get(o.productionBatchId) ?? null) : null,
      amount: totalAmount,
      allocatedAmount: allocated,
      unallocatedAmount: unallocated,
      isFullyAllocated: unallocated <= 0,
    }
  })

  return res.json({ data: enriched })
})

// Create overhead record
costingRouter.post(
  '/overheads',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createOverheadRecordSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as CreateOverheadRecordInput

    // If direct batch, verify batch exists and belongs to tenant
    if (input.allocationType === 'DIRECT_BATCH') {
      if (!input.productionBatchId) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'productionBatchId is required for direct batch overhead.',
        })
      }

      const batch = await prisma.productionBatch.findFirst({
        where: { id: input.productionBatchId, businessId },
      })

      if (!batch) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Production batch not found.' })
      }
    }

    const overhead = await prisma.overheadRecord.create({
      data: {
        businessId,
        branchId: input.branchId,
        productionBatchId: input.allocationType === 'DIRECT_BATCH' ? (input.productionBatchId ?? null) : null,
        operationalDate: new Date(input.operationalDate),
        category: input.category,
        amount: input.amount,
        paymentMethod: input.paymentMethod ?? null,
        allocationType: input.allocationType,
        description: input.description ?? null,
        sourceReference: input.sourceReference ?? null,
        createdById: userId,
      },
    })

    return res.status(201).json({ data: overhead })
  }
)

// Allocate shared daily overhead to batches
costingRouter.post(
  '/overheads/:id/allocate',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(allocateOverheadSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as AllocateOverheadInput

    const overhead = await prisma.overheadRecord.findFirst({
      where: { id, businessId },
    })

    if (!overhead) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Overhead record not found.' })
    }

    if (overhead.allocationType !== 'DAILY_SHARED') {
      return res.status(400).json({
        error: 'INVALID_OVERHEAD_TYPE',
        message: 'Only DAILY_SHARED overheads can be allocated across multiple batches.',
      })
    }

    // Verify allocations do not exceed original amount
    const existingAllocations = await prisma.overheadAllocation.findMany({
      where: { overheadRecordId: id, businessId },
    })

    const currentAllocated = existingAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0)
    const newRequested = input.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
    const totalAmount = Number(overhead.amount)

    if (Number((currentAllocated + newRequested).toFixed(4)) > totalAmount) {
      return res.status(400).json({
        error: 'EXCEEDS_OVERHEAD_AMOUNT',
        message: `Total allocations (${(currentAllocated + newRequested).toFixed(2)}) cannot exceed overhead amount (${totalAmount.toFixed(2)}).`,
      })
    }

    // Verify all batches exist and belong to business
    const batchIds = input.allocations.map((a) => a.productionBatchId)
    const batches = await prisma.productionBatch.findMany({
      where: { id: { in: batchIds }, businessId },
    })

    if (batches.length !== batchIds.length) {
      return res.status(404).json({ error: 'BATCH_NOT_FOUND', message: 'One or more target batches not found.' })
    }

    const createdAllocations = await prisma.$transaction(async (tx) => {
      const records = []
      for (const a of input.allocations) {
        const alloc = await tx.overheadAllocation.create({
          data: {
            businessId,
            overheadRecordId: id,
            productionBatchId: a.productionBatchId,
            allocationMethod: input.allocationMethod,
            allocationPercentage: a.allocationPercentage,
            allocatedAmount: a.allocatedAmount,
          },
        })
        records.push(alloc)
      }
      return records
    })

    return res.status(201).json({
      message: 'Overhead allocated successfully.',
      data: createdAllocations,
    })
  }
)

/**
 * -------------------------------------------------------------
 * Labour Cost Records & Direct/Shared Allocations
 * -------------------------------------------------------------
 */

// List labour cost records
costingRouter.get('/labour-costs', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { branchId, operationalDate, employeeId, status } = req.query as {
    branchId?: string
    operationalDate?: string
    employeeId?: string
    status?: string
  }

  const whereClause: Record<string, unknown> = { businessId }
  if (branchId) whereClause.branchId = branchId
  if (operationalDate) whereClause.operationalDate = new Date(operationalDate)
  if (employeeId) whereClause.employeeId = employeeId
  if (status) whereClause.status = status

  const [records, allocations, employees, branches] = await Promise.all([
    prisma.labourCostRecord.findMany({
      where: whereClause,
      orderBy: { operationalDate: 'desc' },
    }),
    prisma.labourAllocation.findMany({ where: { businessId } }),
    prisma.employee.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
  ])

  const empMap = new Map(employees.map((e) => [e.id, e]))
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))

  const allocatedMap = new Map<string, number>()
  for (const alloc of allocations) {
    const sum = allocatedMap.get(alloc.labourCostRecordId) ?? 0
    allocatedMap.set(alloc.labourCostRecordId, sum + Number(alloc.allocatedAmount))
  }

  const enriched = records.map((r) => {
    const emp = empMap.get(r.employeeId)
    const totalCost = Number(r.totalLabourCost)
    const allocated = Number((allocatedMap.get(r.id) ?? 0).toFixed(4))
    const unallocated = Number(Math.max(0, totalCost - allocated).toFixed(4))

    return {
      ...r,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee',
      employeeNumber: emp?.employeeNumber ?? '',
      branchName: branchMap.get(r.branchId) ?? 'Unknown Branch',
      totalLabourCost: totalCost,
      rateSnapshot: Number(r.rateSnapshot),
      allocatedAmount: allocated,
      unallocatedAmount: unallocated,
    }
  })

  return res.json({ data: enriched })
})

// Create labour cost record
costingRouter.post(
  '/labour-costs',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createLabourCostRecordSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateLabourCostRecordInput

    const [employee, branch] = await Promise.all([
      prisma.employee.findFirst({ where: { id: input.employeeId, businessId } }),
      prisma.branch.findFirst({ where: { id: input.branchId, businessId } }),
    ])

    if (!employee || !branch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee or branch not found.' })
    }

    const record = await prisma.labourCostRecord.create({
      data: {
        businessId,
        branchId: input.branchId,
        employeeId: input.employeeId,
        attendanceRecordId: input.attendanceRecordId ?? null,
        operationalDate: new Date(input.operationalDate),
        workedMinutes: input.workedMinutes,
        compensationTypeSnapshot: input.compensationTypeSnapshot,
        rateSnapshot: input.rateSnapshot,
        totalLabourCost: input.totalLabourCost,
        status: 'UNALLOCATED',
      },
    })

    return res.status(201).json({ data: record })
  }
)

// Allocate labour cost to batch(es)
costingRouter.post(
  '/labour-costs/:id/allocate',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(allocateLabourCostSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as AllocateLabourCostInput

    const labourRecord = await prisma.labourCostRecord.findFirst({
      where: { id, businessId },
    })

    if (!labourRecord) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Labour cost record not found.' })
    }

    // Verify allocations do not exceed total labour cost
    const existingAllocations = await prisma.labourAllocation.findMany({
      where: { labourCostRecordId: id, businessId },
    })

    const currentAllocated = existingAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0)
    const newRequested = input.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
    const totalCost = Number(labourRecord.totalLabourCost)

    if (Number((currentAllocated + newRequested).toFixed(4)) > totalCost) {
      return res.status(400).json({
        error: 'EXCEEDS_LABOUR_COST',
        message: `Total labour allocations (${(currentAllocated + newRequested).toFixed(2)}) cannot exceed total labour cost (${totalCost.toFixed(2)}).`,
      })
    }

    // Verify batches exist
    const batchIds = input.allocations.map((a) => a.productionBatchId)
    const batches = await prisma.productionBatch.findMany({
      where: { id: { in: batchIds }, businessId },
    })

    if (batches.length !== batchIds.length) {
      return res.status(404).json({ error: 'BATCH_NOT_FOUND', message: 'One or more batches not found.' })
    }

    const createdAllocations = await prisma.$transaction(async (tx) => {
      const records = []
      for (const a of input.allocations) {
        const alloc = await tx.labourAllocation.create({
          data: {
            businessId,
            labourCostRecordId: id,
            productionBatchId: a.productionBatchId,
            allocatedMinutes: a.allocatedMinutes,
            allocatedAmount: a.allocatedAmount,
            allocationMethod: input.allocationMethod,
          },
        })
        records.push(alloc)
      }

      // Update status if fully allocated
      const isFullyAllocated = Number((currentAllocated + newRequested).toFixed(4)) >= totalCost
      await tx.labourCostRecord.update({
        where: { id },
        data: { status: isFullyAllocated ? 'ALLOCATED' : 'UNALLOCATED' },
      })

      return records
    })

    return res.status(201).json({
      message: 'Labour cost allocated successfully.',
      data: createdAllocations,
    })
  }
)

/**
 * -------------------------------------------------------------
 * Batch Cost Calculation & Immutable Finalization
 * -------------------------------------------------------------
 */

// Get batch costing details and calculation history
costingRouter.get('/batches/:batchId', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const batchId = req.params.batchId as string

  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, businessId },
  })

  if (!batch) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
  }

  const [costRecords, consumptions, directOverheads, overheadAllocations, labourAllocations, recipe] =
    await Promise.all([
      prisma.productionCostRecord.findMany({
        where: { productionBatchId: batchId, businessId },
        orderBy: { calculationVersion: 'desc' },
      }),
      prisma.materialConsumption.findMany({ where: { productionBatchId: batchId, businessId } }),
      prisma.overheadRecord.findMany({
        where: { productionBatchId: batchId, businessId, allocationType: 'DIRECT_BATCH' },
      }),
      prisma.overheadAllocation.findMany({ where: { productionBatchId: batchId, businessId } }),
      prisma.labourAllocation.findMany({ where: { productionBatchId: batchId, businessId } }),
      prisma.recipe.findFirst({ where: { id: batch.recipeId, businessId } }),
    ])

  const totalMaterialCost = consumptions.reduce((sum, c) => sum + Number(c.totalCost), 0)
  const totalDirectOverhead = directOverheads.reduce((sum, o) => sum + Number(o.amount), 0)
  const totalSharedOverhead = overheadAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0)
  const totalLabourCost = labourAllocations.reduce((sum, l) => sum + Number(l.allocatedAmount), 0)
  const projectedTotalCost = Number(
    (totalMaterialCost + totalDirectOverhead + totalSharedOverhead + totalLabourCost).toFixed(4)
  )

  const acceptedQty = Number(batch.acceptedOutput)
  const projectedUnitCost =
    acceptedQty > 0 ? Number((projectedTotalCost / acceptedQty).toFixed(4)) : null

  return res.json({
    data: {
      batchId,
      batchNumber: batch.batchNumber,
      recipeName: recipe?.name ?? 'Unknown Recipe',
      acceptedOutput: acceptedQty,
      rejectedOutput: Number(batch.rejectedOutput),
      costRecords,
      latestCostRecord: costRecords[0] ?? null,
      liveSummary: {
        materialCost: Number(totalMaterialCost.toFixed(4)),
        directOverheadCost: Number(totalDirectOverhead.toFixed(4)),
        allocatedDailyOverhead: Number(totalSharedOverhead.toFixed(4)),
        allocatedLabourCost: Number(totalLabourCost.toFixed(4)),
        totalBatchCost: projectedTotalCost,
        costPerAcceptedUnit: projectedUnitCost,
      },
    },
  })
})

// Calculate batch cost (creates new calculation version snapshot)
costingRouter.post(
  '/batches/:batchId/calculate',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const batchId = req.params.batchId as string

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    const [consumptions, directOverheads, overheadAllocations, labourAllocations, latestRecord] =
      await Promise.all([
        prisma.materialConsumption.findMany({ where: { productionBatchId: batchId, businessId } }),
        prisma.overheadRecord.findMany({
          where: { productionBatchId: batchId, businessId, allocationType: 'DIRECT_BATCH' },
        }),
        prisma.overheadAllocation.findMany({ where: { productionBatchId: batchId, businessId } }),
        prisma.labourAllocation.findMany({ where: { productionBatchId: batchId, businessId } }),
        prisma.productionCostRecord.findFirst({
          where: { productionBatchId: batchId, businessId },
          orderBy: { calculationVersion: 'desc' },
        }),
      ])

    // If latest record was finalized, bump version
    const nextVersion = (latestRecord?.calculationVersion ?? 0) + 1

    const materialCost = Number(
      consumptions.reduce((sum, c) => sum + Number(c.totalCost), 0).toFixed(4)
    )
    const directOverheadCost = Number(
      directOverheads.reduce((sum, o) => sum + Number(o.amount), 0).toFixed(4)
    )
    const allocatedDailyOverhead = Number(
      overheadAllocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0).toFixed(4)
    )
    const allocatedLabourCost = Number(
      labourAllocations.reduce((sum, l) => sum + Number(l.allocatedAmount), 0).toFixed(4)
    )

    const totalBatchCost = Number(
      (materialCost + directOverheadCost + allocatedDailyOverhead + allocatedLabourCost).toFixed(4)
    )

    const acceptedQuantity = Number(batch.acceptedOutput)
    // Unit Cost Absorption Invariant: Total batch cost absorbed strictly by accepted sellable units
    const costPerAcceptedUnit =
      acceptedQuantity > 0 ? Number((totalBatchCost / acceptedQuantity).toFixed(4)) : null

    const costRecord = await prisma.productionCostRecord.create({
      data: {
        businessId,
        productionBatchId: batchId,
        materialCost,
        directOverheadCost,
        allocatedDailyOverhead,
        allocatedLabourCost,
        totalBatchCost,
        acceptedQuantity,
        costPerAcceptedUnit,
        calculationVersion: nextVersion,
        calculatedAt: new Date(),
      },
    })

    return res.status(201).json({
      message: `Batch cost calculation version ${nextVersion} completed.`,
      data: costRecord,
    })
  }
)

// Finalize batch costing (permanently locks the cost record snapshot)
costingRouter.post(
  '/batches/:batchId/finalize',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const batchId = req.params.batchId as string

    const costRecord = await prisma.productionCostRecord.findFirst({
      where: { productionBatchId: batchId, businessId },
      orderBy: { calculationVersion: 'desc' },
    })

    if (!costRecord) {
      return res.status(404).json({
        error: 'NO_COST_RECORD',
        message: 'No cost record found. Run calculation before finalization.',
      })
    }

    if (costRecord.finalizedAt) {
      return res.status(400).json({
        error: 'ALREADY_FINALIZED',
        message: 'This batch cost calculation is already finalized and immutable.',
      })
    }

    const finalized = await prisma.$transaction(async (tx) => {
      const updatedCost = await tx.productionCostRecord.update({
        where: { id: costRecord.id },
        data: { finalizedAt: new Date() },
      })

      // Lock linked labour allocations to FINALIZED
      const labourAllocs = await tx.labourAllocation.findMany({
        where: { productionBatchId: batchId, businessId },
      })
      const labourRecordIds = Array.from(new Set(labourAllocs.map((a) => a.labourCostRecordId)))

      if (labourRecordIds.length > 0) {
        await tx.labourCostRecord.updateMany({
          where: { id: { in: labourRecordIds }, businessId },
          data: { status: 'FINALIZED' },
        })
      }

      return updatedCost
    })

    return res.json({
      message: 'Batch costing finalized and locked immutably.',
      data: finalized,
    })
  }
)
