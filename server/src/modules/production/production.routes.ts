import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  createProductionSessionSchema,
  updateSessionStatusSchema,
  createProductionBatchSchema,
  createBatchAssignmentSchema,
  recordMaterialConsumptionSchema,
  recordProductionOutputSchema,
  recordBakerProductionSchema,
  type CreateProductionSessionInput,
  type UpdateSessionStatusInput,
  type CreateProductionBatchInput,
  type CreateBatchAssignmentInput,
  type RecordMaterialConsumptionInput,
  type RecordProductionOutputInput,
  type RecordBakerProductionInput,
} from './production.schema.js'

export const productionRouter: ExpressRouter = Router()

// All production routes require authenticated identity
productionRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Reports & Reconciliation
 * -------------------------------------------------------------
 */

// Baker productivity report
productionRouter.get('/reports/baker-productivity', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { startDate, endDate, branchId } = req.query as {
    startDate?: string
    endDate?: string
    branchId?: string
  }

  const whereClause: Record<string, unknown> = { businessId }
  if (branchId) whereClause.branchId = branchId
  if (startDate || endDate) {
    whereClause.operationalDate = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    }
  }

  const [records, employees] = await Promise.all([
    prisma.bakerProductionRecord.findMany({
      where: whereClause,
      orderBy: { operationalDate: 'desc' },
    }),
    prisma.employee.findMany({ where: { businessId } }),
  ])

  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName} (${e.employeeNumber})`]))

  // Aggregate by employee
  const summaryByBaker = new Map<
    string,
    {
      employeeId: string
      bakerName: string
      totalProduced: number
      acceptedQuantity: number
      rejectedQuantity: number
      sessionCount: Set<string>
    }
  >()

  for (const r of records) {
    const existing = summaryByBaker.get(r.employeeId) ?? {
      employeeId: r.employeeId,
      bakerName: empMap.get(r.employeeId) ?? 'Unknown Baker',
      totalProduced: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      sessionCount: new Set<string>(),
    }

    existing.totalProduced += r.totalProduced
    existing.acceptedQuantity += r.acceptedQuantity
    existing.rejectedQuantity += r.rejectedQuantity
    existing.sessionCount.add(r.productionSessionId)
    summaryByBaker.set(r.employeeId, existing)
  }

  const result = Array.from(summaryByBaker.values()).map((b) => ({
    employeeId: b.employeeId,
    bakerName: b.bakerName,
    totalProduced: b.totalProduced,
    acceptedQuantity: b.acceptedQuantity,
    rejectedQuantity: b.rejectedQuantity,
    rejectionRatePercentage:
      b.totalProduced > 0 ? Number(((b.rejectedQuantity / b.totalProduced) * 100).toFixed(2)) : 0,
    distinctSessionsWorked: b.sessionCount.size,
  }))

  return res.json({ data: result })
})

// Output & Baker Reconciliation report
productionRouter.get('/reports/reconciliations', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { batchId } = req.query as { batchId?: string }

  if (!batchId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'batchId query parameter is required.' })
  }

  const batch = await prisma.productionBatch.findFirst({
    where: { id: batchId, businessId },
  })

  if (!batch) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
  }

  const [outputs, bakerRecords] = await Promise.all([
    prisma.productionOutput.findMany({ where: { productionBatchId: batchId, businessId } }),
    prisma.bakerProductionRecord.findMany({ where: { productionBatchId: batchId, businessId } }),
  ])

  let teamTotal = 0
  let teamAccepted = 0
  let teamRejected = 0
  for (const out of outputs) {
    teamTotal += out.totalQuantity
    teamAccepted += out.acceptedQuantity
    teamRejected += out.rejectedQuantity
  }

  let bakerTotal = 0
  let bakerAccepted = 0
  let bakerRejected = 0
  for (const b of bakerRecords) {
    bakerTotal += b.totalProduced
    bakerAccepted += b.acceptedQuantity
    bakerRejected += b.rejectedQuantity
  }

  const unallocatedAccepted = Math.max(0, teamAccepted - bakerAccepted)
  const unallocatedRejected = Math.max(0, teamRejected - bakerRejected)
  const unallocatedTotal = unallocatedAccepted + unallocatedRejected

  const isReconciled = teamAccepted >= bakerAccepted && teamRejected >= bakerRejected

  return res.json({
    data: {
      batchId,
      batchNumber: batch.batchNumber,
      teamOutput: {
        total: teamTotal,
        accepted: teamAccepted,
        rejected: teamRejected,
      },
      bakerAttributed: {
        total: bakerTotal,
        accepted: bakerAccepted,
        rejected: bakerRejected,
      },
      unallocated: {
        total: unallocatedTotal,
        accepted: unallocatedAccepted,
        rejected: unallocatedRejected,
      },
      isReconciled,
    },
  })
})

/**
 * -------------------------------------------------------------
 * Production Sessions
 * -------------------------------------------------------------
 */

// List production sessions
productionRouter.get('/sessions', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { branchId, status, operationalDate } = req.query as {
    branchId?: string
    status?: string
    operationalDate?: string
  }

  const whereClause: Record<string, unknown> = { businessId }
  if (branchId) whereClause.branchId = branchId
  if (status) whereClause.status = status
  if (operationalDate) whereClause.operationalDate = new Date(operationalDate)

  const [sessions, branches, employees, batches] = await Promise.all([
    prisma.productionSession.findMany({
      where: whereClause,
      orderBy: { operationalDate: 'desc' },
    }),
    prisma.branch.findMany({ where: { businessId } }),
    prisma.employee.findMany({ where: { businessId } }),
    prisma.productionBatch.findMany({ where: { businessId } }),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))

  const batchCountBySession = new Map<string, number>()
  for (const b of batches) {
    const count = batchCountBySession.get(b.productionSessionId) ?? 0
    batchCountBySession.set(b.productionSessionId, count + 1)
  }

  const enriched = sessions.map((s) => ({
    ...s,
    branchName: branchMap.get(s.branchId) ?? 'Unknown Branch',
    supervisorName: empMap.get(s.supervisorId) ?? 'Unknown Supervisor',
    batchCount: batchCountBySession.get(s.id) ?? 0,
  }))

  return res.json({ data: enriched })
})

// Create production session
productionRouter.post(
  '/sessions',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(createProductionSessionSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateProductionSessionInput

    // Verify unique sessionNumber for business
    const existing = await prisma.productionSession.findUnique({
      where: { businessId_sessionNumber: { businessId, sessionNumber: input.sessionNumber } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A session with this number already exists.' })
    }

    // Verify branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, businessId },
    })

    if (!branch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found.' })
    }

    const session = await prisma.productionSession.create({
      data: {
        businessId,
        branchId: input.branchId,
        sessionNumber: input.sessionNumber,
        operationalDate: new Date(input.operationalDate),
        startTime: new Date(input.startTime),
        endTime: input.endTime ? new Date(input.endTime) : null,
        shiftAssignmentId: input.shiftAssignmentId ?? null,
        supervisorId: input.supervisorId,
        status: 'DRAFT',
        notes: input.notes ?? null,
      },
    })

    return res.status(201).json({ data: session })
  }
)

// Get single production session
productionRouter.get('/sessions/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const session = await prisma.productionSession.findFirst({
    where: { id, businessId },
  })

  if (!session) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Production session not found.' })
  }

  const [branch, supervisor, batches, recipes] = await Promise.all([
    prisma.branch.findFirst({ where: { id: session.branchId, businessId } }),
    prisma.employee.findFirst({ where: { id: session.supervisorId, businessId } }),
    prisma.productionBatch.findMany({
      where: { productionSessionId: id, businessId },
      orderBy: { batchNumber: 'asc' },
    }),
    prisma.recipe.findMany({ where: { businessId } }),
  ])

  const recipeMap = new Map(recipes.map((r) => [r.id, r.name]))

  const enrichedBatches = batches.map((b) => ({
    ...b,
    recipeName: recipeMap.get(b.recipeId) ?? 'Unknown Recipe',
  }))

  return res.json({
    data: {
      ...session,
      branchName: branch?.name ?? 'Unknown Branch',
      supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : 'Unknown Supervisor',
      batches: enrichedBatches,
    },
  })
})

// Update session status
productionRouter.patch(
  '/sessions/:id/status',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(updateSessionStatusSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as UpdateSessionStatusInput

    const session = await prisma.productionSession.findFirst({
      where: { id, businessId },
    })

    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Production session not found.' })
    }

    const updated = await prisma.productionSession.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.endTime && { endTime: new Date(input.endTime) }),
      },
    })

    return res.json({ data: updated })
  }
)

/**
 * -------------------------------------------------------------
 * Production Batches
 * -------------------------------------------------------------
 */

// List batches
productionRouter.get('/batches', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { productionSessionId, status } = req.query as {
    productionSessionId?: string
    status?: string
  }

  const whereClause: Record<string, unknown> = { businessId }
  if (productionSessionId) whereClause.productionSessionId = productionSessionId
  if (status) whereClause.status = status

  const [batches, sessions, recipes, branches] = await Promise.all([
    prisma.productionBatch.findMany({
      where: whereClause,
      orderBy: { batchNumber: 'asc' },
    }),
    prisma.productionSession.findMany({ where: { businessId } }),
    prisma.recipe.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
  ])

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const recipeMap = new Map(recipes.map((r) => [r.id, r.name]))
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))

  const enriched = batches.map((b) => {
    const session = sessionMap.get(b.productionSessionId)
    const branchName = session ? branchMap.get(session.branchId) : 'Unknown Branch'
    return {
      ...b,
      sessionNumber: session?.sessionNumber ?? 'Unknown Session',
      operationalDate: session?.operationalDate ?? null,
      branchName,
      recipeName: recipeMap.get(b.recipeId) ?? 'Unknown Recipe',
    }
  })

  return res.json({ data: enriched })
})

// Create batch within a session
productionRouter.post(
  '/batches',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(createProductionBatchSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateProductionBatchInput

    // Verify session belongs to business and is not CANCELLED
    const session = await prisma.productionSession.findFirst({
      where: { id: input.productionSessionId, businessId },
    })

    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Production session not found.' })
    }

    if (session.status === 'CANCELLED') {
      return res.status(400).json({ error: 'SESSION_CANCELLED', message: 'Cannot create batches in a cancelled session.' })
    }

    // Verify unique batch number
    const existing = await prisma.productionBatch.findUnique({
      where: { businessId_batchNumber: { businessId, batchNumber: input.batchNumber } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A batch with this number already exists.' })
    }

    // Verify recipe and version exist
    const [recipe, version] = await Promise.all([
      prisma.recipe.findFirst({ where: { id: input.recipeId, businessId } }),
      prisma.recipeVersion.findFirst({
        where: { id: input.recipeVersionId, recipeId: input.recipeId, businessId },
      }),
    ])

    if (!recipe || !version) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Recipe or Recipe Version not found.' })
    }

    const batch = await prisma.productionBatch.create({
      data: {
        businessId,
        productionSessionId: input.productionSessionId,
        recipeId: input.recipeId,
        recipeVersionId: input.recipeVersionId,
        batchNumber: input.batchNumber,
        plannedQuantity: input.plannedQuantity,
        startTime: input.startTime ? new Date(input.startTime) : new Date(),
        status: 'DRAFT',
      },
    })

    return res.status(201).json({ data: batch })
  }
)

// Get single batch with full breakdown
productionRouter.get('/batches/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const batch = await prisma.productionBatch.findFirst({
    where: { id, businessId },
  })

  if (!batch) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Production batch not found.' })
  }

  const [session, recipe, version, consumptions, outputs, rejections, bakers, assignments, materials, lots, units, employees] =
    await Promise.all([
      prisma.productionSession.findFirst({ where: { id: batch.productionSessionId, businessId } }),
      prisma.recipe.findFirst({ where: { id: batch.recipeId, businessId } }),
      prisma.recipeVersion.findFirst({ where: { id: batch.recipeVersionId, businessId } }),
      prisma.materialConsumption.findMany({ where: { productionBatchId: id, businessId } }),
      prisma.productionOutput.findMany({ where: { productionBatchId: id, businessId } }),
      prisma.rejectionRecord.findMany({ where: { productionBatchId: id, businessId } }),
      prisma.bakerProductionRecord.findMany({ where: { productionBatchId: id, businessId } }),
      prisma.batchEmployeeAssignment.findMany({ where: { productionBatchId: id, businessId } }),
      prisma.material.findMany({ where: { businessId } }),
      prisma.materialLot.findMany({ where: { businessId } }),
      prisma.unitOfMeasure.findMany({ where: { businessId } }),
      prisma.employee.findMany({ where: { businessId } }),
    ])

  const lotMap = new Map(lots.map((l) => [l.id, l]))
  const matMap = new Map(materials.map((m) => [m.id, m.name]))
  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))
  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))

  const enrichedConsumptions = consumptions.map((c) => {
    const lot = lotMap.get(c.materialLotId)
    return {
      ...c,
      lotNumber: lot?.lotNumber ?? 'Unknown Lot',
      materialName: lot ? (matMap.get(lot.materialId) ?? 'Unknown Material') : 'Unknown Material',
      unitSymbol: unitMap.get(c.unitId) ?? 'unit',
    }
  })

  const enrichedAssignments = assignments.map((a) => ({
    ...a,
    employeeName: empMap.get(a.employeeId) ?? 'Unknown Employee',
  }))

  const enrichedBakers = bakers.map((b) => ({
    ...b,
    bakerName: empMap.get(b.employeeId) ?? 'Unknown Baker',
  }))

  const enrichedRejections = rejections.map((r) => ({
    ...r,
    employeeName: r.employeeId ? (empMap.get(r.employeeId) ?? 'Unassigned') : 'Unassigned',
  }))

  return res.json({
    data: {
      ...batch,
      sessionNumber: session?.sessionNumber ?? 'Unknown',
      recipeName: recipe?.name ?? 'Unknown',
      versionNumber: version?.versionNumber ?? 1,
      consumptions: enrichedConsumptions,
      outputs,
      rejections: enrichedRejections,
      bakers: enrichedBakers,
      assignments: enrichedAssignments,
    },
  })
})

// Assign employee to batch
productionRouter.post(
  '/batches/:id/assignments',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(createBatchAssignmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const batchId = req.params.id as string
    const input = req.body as CreateBatchAssignmentInput

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found.' })
    }

    const assignment = await prisma.batchEmployeeAssignment.upsert({
      where: {
        productionBatchId_employeeId: {
          productionBatchId: batchId,
          employeeId: input.employeeId,
        },
      },
      update: {
        assignmentRole: input.assignmentRole,
        assignedStart: new Date(input.assignedStart),
        assignedEnd: input.assignedEnd ? new Date(input.assignedEnd) : null,
        notes: input.notes ?? null,
      },
      create: {
        businessId,
        productionBatchId: batchId,
        employeeId: input.employeeId,
        assignmentRole: input.assignmentRole,
        assignedStart: new Date(input.assignedStart),
        assignedEnd: input.assignedEnd ? new Date(input.assignedEnd) : null,
        notes: input.notes ?? null,
      },
    })

    return res.status(201).json({ data: assignment })
  }
)

// Record material lot consumption (decrements stock & creates movements)
productionRouter.post(
  '/batches/:id/consume',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(recordMaterialConsumptionSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const batchId = req.params.id as string
    const input = req.body as RecordMaterialConsumptionInput

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'IMMUTABLE_BATCH',
        message: `Cannot consume materials for a batch with status ${batch.status}.`,
      })
    }

    // Validate all lots have sufficient stock
    const lotIds = input.consumptions.map((c) => c.materialLotId)
    const lots = await prisma.materialLot.findMany({
      where: { id: { in: lotIds }, businessId },
    })
    const lotMap = new Map(lots.map((l) => [l.id, l]))

    for (const c of input.consumptions) {
      const lot = lotMap.get(c.materialLotId)
      if (!lot) {
        return res.status(404).json({ error: 'LOT_NOT_FOUND', message: `Lot ${c.materialLotId} not found.` })
      }

      const available = Number(lot.remainingQuantity)
      if (available < c.actualQuantity) {
        return res.status(400).json({
          error: 'INSUFFICIENT_LOT_STOCK',
          message: `Cannot consume ${c.actualQuantity} from lot ${lot.lotNumber}. Available balance is only ${available}.`,
        })
      }
    }

    // Execute in transaction: deduct remainingQuantity and record movements
    const recordedConsumptions = await prisma.$transaction(async (tx) => {
      const records = []

      for (const c of input.consumptions) {
        const lot = lotMap.get(c.materialLotId)!
        const unitCost = Number(lot.unitCost)
        const totalCost = Number((c.actualQuantity * unitCost).toFixed(4))

        // Create MaterialConsumption
        const consumption = await tx.materialConsumption.create({
          data: {
            businessId,
            productionBatchId: batchId,
            materialLotId: c.materialLotId,
            actualQuantity: c.actualQuantity,
            unitId: c.unitId,
            unitCostSnapshot: unitCost,
            totalCost,
            consumedAt: new Date(),
          },
        })

        // Deduct lot stock
        const newRemaining = Number((Number(lot.remainingQuantity) - c.actualQuantity).toFixed(4))
        const newStatus = newRemaining === 0 ? 'DEPLETED' : 'AVAILABLE'

        await tx.materialLot.update({
          where: { id: lot.id },
          data: {
            remainingQuantity: newRemaining,
            status: newStatus,
          },
        })

        // Log PRODUCTION_CONSUMPTION movement
        await tx.materialLotMovement.create({
          data: {
            businessId,
            materialLotId: lot.id,
            movementType: 'PRODUCTION_CONSUMPTION',
            quantity: c.actualQuantity,
            unitCostSnapshot: unitCost,
            totalCost,
            referenceType: 'PRODUCTION_BATCH',
            referenceId: batchId,
            createdById: userId,
          },
        })

        records.push(consumption)
      }

      // If batch is still DRAFT, move to IN_PROGRESS
      if (batch.status === 'DRAFT') {
        await tx.productionBatch.update({
          where: { id: batchId },
          data: { status: 'IN_PROGRESS' },
        })
      }

      return records
    })

    return res.status(201).json({
      message: 'Materials consumed and lot stocks updated successfully.',
      data: recordedConsumptions,
    })
  }
)

// Record product outputs & detailed rejections
productionRouter.post(
  '/batches/:id/outputs',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(recordProductionOutputSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const batchId = req.params.id as string
    const input = req.body as RecordProductionOutputInput

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'IMMUTABLE_BATCH',
        message: `Cannot record outputs for a batch with status ${batch.status}.`,
      })
    }

    // Verify product exists
    const product = await prisma.finishedProduct.findFirst({
      where: { id: input.productId, businessId },
    })

    if (!product) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found.' })
    }

    // If detailed rejections provided, verify sum matches rejectedQuantity
    if (input.rejections && input.rejections.length > 0) {
      const sumRejections = input.rejections.reduce((sum, r) => sum + r.quantity, 0)
      if (sumRejections !== input.rejectedQuantity) {
        return res.status(400).json({
          error: 'REJECTION_SUM_MISMATCH',
          message: `Sum of detailed rejections (${sumRejections}) must equal rejectedQuantity (${input.rejectedQuantity}).`,
        })
      }
    }

    const totalQuantity = input.acceptedQuantity + input.rejectedQuantity

    const result = await prisma.$transaction(async (tx) => {
      const output = await tx.productionOutput.create({
        data: {
          businessId,
          productionBatchId: batchId,
          productId: input.productId,
          totalQuantity,
          acceptedQuantity: input.acceptedQuantity,
          rejectedQuantity: input.rejectedQuantity,
          allocationMethod: input.allocationMethod,
          allocatedCost: 0,
          unitCost: 0,
        },
      })

      // Record detailed rejections if provided
      const createdRejections = []
      if (input.rejections && input.rejections.length > 0) {
        for (const rej of input.rejections) {
          const rec = await tx.rejectionRecord.create({
            data: {
              businessId,
              productionBatchId: batchId,
              productionOutputId: output.id,
              employeeId: rej.employeeId ?? null,
              reason: rej.reason,
              quantity: rej.quantity,
              notes: rej.notes ?? null,
              evidenceReference: rej.evidenceReference ?? null,
            },
          })
          createdRejections.push(rec)
        }
      }

      // Update batch running outputs
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          actualOutput: Number((Number(batch.actualOutput) + totalQuantity).toFixed(4)),
          acceptedOutput: Number((Number(batch.acceptedOutput) + input.acceptedQuantity).toFixed(4)),
          rejectedOutput: Number((Number(batch.rejectedOutput) + input.rejectedQuantity).toFixed(4)),
          status: 'IN_PROGRESS',
        },
      })

      return { output, rejections: createdRejections, updatedBatch }
    })

    return res.status(201).json({
      message: 'Batch output and rejections recorded successfully.',
      data: result,
    })
  }
)

// Record individual baker output attribution
productionRouter.post(
  '/batches/:id/bakers',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  validateBody(recordBakerProductionSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const batchId = req.params.id as string
    const input = req.body as RecordBakerProductionInput

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    const session = await prisma.productionSession.findFirst({
      where: { id: batch.productionSessionId, businessId },
    })

    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found.' })
    }

    // Verify employee exists and belongs to business
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found.' })
    }

    // Invariant: Baker attributions must not exceed batch team outputs for this product
    const outputs = await prisma.productionOutput.findMany({
      where: { productionBatchId: batchId, productId: input.productId, businessId },
    })

    const teamAccepted = outputs.reduce((sum, o) => sum + o.acceptedQuantity, 0)
    const existingBakers = await prisma.bakerProductionRecord.findMany({
      where: { productionBatchId: batchId, productId: input.productId, businessId },
    })

    const currentBakerAccepted = existingBakers.reduce((sum, b) => sum + b.acceptedQuantity, 0)
    if (currentBakerAccepted + input.acceptedQuantity > teamAccepted) {
      return res.status(400).json({
        error: 'EXCEEDS_TEAM_OUTPUT',
        message: `Attributed baker accepted quantity (${currentBakerAccepted + input.acceptedQuantity}) exceeds total batch accepted output (${teamAccepted}) for this product.`,
      })
    }

    const totalProduced = input.acceptedQuantity + input.rejectedQuantity

    const record = await prisma.bakerProductionRecord.create({
      data: {
        businessId,
        branchId: session.branchId,
        employeeId: input.employeeId,
        productionSessionId: session.id,
        productionBatchId: batchId,
        shiftAssignmentId: input.shiftAssignmentId ?? null,
        productId: input.productId,
        operationalDate: session.operationalDate,
        totalProduced,
        acceptedQuantity: input.acceptedQuantity,
        rejectedQuantity: input.rejectedQuantity,
        attributionMethod: input.attributionMethod,
        recordedById: userId,
        notes: input.notes ?? null,
      },
    })

    return res.status(201).json({
      message: 'Baker output attributed successfully.',
      data: record,
    })
  }
)

// Finalize batch (validates completion, reconciles outputs, locks batch)
productionRouter.post(
  '/batches/:id/finalize',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const batchId = req.params.id as string

    const batch = await prisma.productionBatch.findFirst({
      where: { id: batchId, businessId },
    })

    if (!batch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Batch not found.' })
    }

    if (batch.status === 'COMPLETED') {
      return res.status(400).json({ error: 'ALREADY_COMPLETED', message: 'Batch is already finalized.' })
    }

    if (batch.status === 'CANCELLED') {
      return res.status(400).json({ error: 'BATCH_CANCELLED', message: 'Cannot finalize a cancelled batch.' })
    }

    // Verify material consumption has been recorded
    const consumptionsCount = await prisma.materialConsumption.count({
      where: { productionBatchId: batchId, businessId },
    })

    if (consumptionsCount === 0) {
      return res.status(400).json({
        error: 'NO_MATERIAL_CONSUMPTION',
        message: 'Cannot finalize batch: actual material consumption must be recorded first.',
      })
    }

    // Verify actual output recorded
    const outputs = await prisma.productionOutput.findMany({
      where: { productionBatchId: batchId, businessId },
    })

    if (outputs.length === 0) {
      return res.status(400).json({
        error: 'NO_OUTPUT_RECORDED',
        message: 'Cannot finalize batch: actual product outputs must be recorded first.',
      })
    }

    // Output Reconciliation Invariant: actual_output = accepted_output + rejected_output
    const actualOutputNum = Number(batch.actualOutput)
    const acceptedOutputNum = Number(batch.acceptedOutput)
    const rejectedOutputNum = Number(batch.rejectedOutput)

    if (actualOutputNum !== acceptedOutputNum + rejectedOutputNum) {
      return res.status(400).json({
        error: 'OUTPUT_RECONCILIATION_FAILED',
        message: `Output reconciliation failed: actual (${actualOutputNum}) != accepted (${acceptedOutputNum}) + rejected (${rejectedOutputNum}).`,
      })
    }

    const finalizedBatch = await prisma.productionBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        finalizedAt: new Date(),
        finalizedById: userId,
        endTime: new Date(),
      },
    })

    return res.json({
      message: 'Production batch finalized and locked successfully.',
      data: finalizedBatch,
    })
  }
)
