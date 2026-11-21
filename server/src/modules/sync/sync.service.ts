import { prisma, Prisma } from '../../lib/prisma.js'
import {
  type SyncOperationEnvelope,
  type ResolveConflictInput,
} from './sync.schema.js'

export interface ProcessOperationResult {
  idempotencyKey: string
  operationType: string
  status: 'PROCESSED' | 'CONFLICT' | 'FAILED' | 'PENDING'
  idempotent?: boolean
  operationId: string
  conflictId?: string
  message?: string
  data?: Record<string, unknown>
}

export class SyncService {
  /**
   * Process a single offline operation envelope idempotently.
   */
  async processOperation(
    businessId: string,
    deviceId: string,
    actorId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    // 1. Idempotency Check
    const existing = await prisma.syncOperation.findUnique({
      where: {
        businessId_idempotencyKey: {
          businessId,
          idempotencyKey: op.idempotencyKey,
        },
      },
    })

    if (existing) {
      if (existing.syncStatus === 'PROCESSED') {
        return {
          idempotencyKey: op.idempotencyKey,
          operationType: op.operationType,
          status: 'PROCESSED',
          idempotent: true,
          operationId: existing.id,
          message: 'Operation already processed previously (idempotent replay)',
        }
      }

      if (existing.syncStatus === 'CONFLICT') {
        const conflict = await prisma.syncConflict.findFirst({
          where: { businessId, syncOperationId: existing.id },
        })
        return {
          idempotencyKey: op.idempotencyKey,
          operationType: op.operationType,
          status: 'CONFLICT',
          idempotent: true,
          operationId: existing.id,
          ...(conflict?.id ? { conflictId: conflict.id } : {}),
          message: 'Operation is in open conflict',
        }
      }

      if (existing.syncStatus === 'FAILED') {
        return {
          idempotencyKey: op.idempotencyKey,
          operationType: op.operationType,
          status: 'FAILED',
          idempotent: true,
          operationId: existing.id,
          message: 'Operation previously failed',
        }
      }
    }

    // 2. Register SyncOperation in database
    const opRecord = await prisma.syncOperation.create({
      data: {
        businessId,
        deviceId: op.deviceId || deviceId,
        actorId: op.actorId || actorId,
        idempotencyKey: op.idempotencyKey,
        operationType: op.operationType,
        schemaVersion: op.schemaVersion ?? 1,
        payload: op.payload,
        clientTimestamp: new Date(op.clientTimestamp),
        ...(op.operationalDate ? { operationalDate: new Date(op.operationalDate) } : {}),
        syncStatus: 'PENDING',
      },
    })

    try {
      // 3. Dispatch to operation handler
      switch (op.operationType) {
        case 'ATTENDANCE_CLOCK_IN':
          return await this.handleAttendanceClockIn(businessId, actorId, opRecord.id, op)

        case 'ATTENDANCE_CLOCK_OUT':
          return await this.handleAttendanceClockOut(businessId, actorId, opRecord.id, op)

        case 'EXPENSE_RECORD':
          return await this.handleExpenseRecord(businessId, actorId, opRecord.id, op)

        case 'PURCHASE_CREATE':
          return await this.handlePurchaseCreate(businessId, actorId, opRecord.id, op)

        case 'SALES_ORDER_CREATE':
          return await this.handleSalesOrderCreate(businessId, actorId, opRecord.id, op)

        default: {
          await prisma.syncOperation.update({
            where: { id: opRecord.id },
            data: {
              syncStatus: 'FAILED',
              errorDetails: { message: `Unsupported operation type: ${op.operationType}` },
            },
          })
          return {
            idempotencyKey: op.idempotencyKey,
            operationType: op.operationType,
            status: 'FAILED',
            operationId: opRecord.id,
            message: `Unsupported operation type: ${op.operationType}`,
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown synchronization error'
      await prisma.syncOperation.update({
        where: { id: opRecord.id },
        data: {
          syncStatus: 'FAILED',
          errorDetails: { message: errorMessage },
        },
      })
      return {
        idempotencyKey: op.idempotencyKey,
        operationType: op.operationType,
        status: 'FAILED',
        operationId: opRecord.id,
        message: errorMessage,
      }
    }
  }

  /**
   * Process a batch of sync operations in sequence.
   */
  async processBatch(
    businessId: string,
    deviceId: string,
    actorId: string,
    operations: SyncOperationEnvelope[]
  ) {
    const results: ProcessOperationResult[] = []

    for (const op of operations) {
      const res = await this.processOperation(businessId, deviceId, actorId, op)
      results.push(res)
    }

    const processedCount = results.filter((r) => r.status === 'PROCESSED').length
    const conflictCount = results.filter((r) => r.status === 'CONFLICT').length
    const failedCount = results.filter((r) => r.status === 'FAILED').length

    return {
      total: operations.length,
      processed: processedCount,
      conflicts: conflictCount,
      failed: failedCount,
      results,
    }
  }

  // --------------------------------------------------------------------------
  // Operation Handlers
  // --------------------------------------------------------------------------

  private async handleAttendanceClockIn(
    businessId: string,
    actorId: string,
    operationId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    const { employeeId, branchId, operationalDate, shiftAssignmentId, notes } = op.payload

    const employee = await prisma.employee.findFirst({
      where: { id: String(employeeId), businessId },
    })

    if (!employee) {
      throw new Error(`Employee ${employeeId} not found in this business`)
    }

    const branch = await prisma.branch.findFirst({
      where: { id: String(branchId), businessId },
    })

    if (!branch) {
      throw new Error(`Branch ${branchId} not found in this business`)
    }

    const clockInTime = new Date(op.clientTimestamp)
    const opDate = operationalDate ? new Date(operationalDate) : clockInTime

    const record = await prisma.attendanceRecord.create({
      data: {
        businessId,
        branchId: branch.id,
        employeeId: employee.id,
        ...(shiftAssignmentId ? { shiftAssignmentId: String(shiftAssignmentId) } : {}),
        operationalDate: opDate,
        clockIn: clockInTime,
        status: 'PRESENT',
        ...(notes ? { notes: String(notes) } : {}),
        recordedById: actorId,
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'OFFLINE_ATTENDANCE_CLOCK_IN',
        entityType: 'ATTENDANCE_RECORD',
        entityId: record.id,
        source: 'OFFLINE_SYNC',
        afterData: { recordId: record.id, employeeId: employee.id, clockIn: clockInTime },
      },
    })

    await prisma.syncOperation.update({
      where: { id: operationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    return {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      status: 'PROCESSED',
      operationId,
      data: { attendanceRecordId: record.id },
    }
  }

  private async handleAttendanceClockOut(
    businessId: string,
    actorId: string,
    operationId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    const { employeeId } = op.payload

    // Find the latest open attendance record
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        businessId,
        employeeId: String(employeeId),
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    })

    if (!record) {
      throw new Error(`No active clock-in found for employee ${employeeId}`)
    }

    const clockOutTime = new Date(op.clientTimestamp)

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: clockOutTime,
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'OFFLINE_ATTENDANCE_CLOCK_OUT',
        entityType: 'ATTENDANCE_RECORD',
        entityId: updated.id,
        source: 'OFFLINE_SYNC',
        afterData: { recordId: updated.id, clockOut: clockOutTime },
      },
    })

    await prisma.syncOperation.update({
      where: { id: operationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    return {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      status: 'PROCESSED',
      operationId,
      data: { attendanceRecordId: updated.id },
    }
  }

  private async handleExpenseRecord(
    businessId: string,
    actorId: string,
    operationId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    const { categoryId, branchId, amount, paymentMethod, expenseDate, description, referenceNumber } =
      op.payload

    const category = await prisma.expenseCategory.findFirst({
      where: { id: String(categoryId), businessId },
    })

    if (!category) {
      throw new Error(`Expense category ${categoryId} not found in this business`)
    }

    const resolvedBranchId = branchId
      ? String(branchId)
      : (await prisma.branch.findFirst({ where: { businessId } }))?.id

    if (!resolvedBranchId) {
      throw new Error('Branch is required for expense')
    }

    const expDate = expenseDate ? new Date(expenseDate) : new Date(op.clientTimestamp)

    const expense = await prisma.expense.create({
      data: {
        businessId,
        categoryId: category.id,
        branchId: resolvedBranchId,
        amount: new Prisma.Decimal(Number(amount)),
        paymentMethod: (paymentMethod as any) || 'CASH',
        expenseDate: expDate,
        ...(description ? { description: String(description) } : {}),
        ...(referenceNumber ? { referenceNumber: String(referenceNumber) } : {}),
        createdById: actorId,
        status: 'RECORDED',
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'OFFLINE_EXPENSE_RECORD',
        entityType: 'EXPENSE',
        entityId: expense.id,
        source: 'OFFLINE_SYNC',
        afterData: { expenseId: expense.id, amount: Number(amount), category: category.name },
      },
    })

    await prisma.syncOperation.update({
      where: { id: operationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    return {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      status: 'PROCESSED',
      operationId,
      data: { expenseId: expense.id },
    }
  }

  private async handlePurchaseCreate(
    businessId: string,
    actorId: string,
    operationId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    const { supplierId, branchId, purchaseDate, invoiceNumber, items } = op.payload

    const pDate = purchaseDate ? new Date(purchaseDate) : new Date(op.clientTimestamp)
    const itemsList = Array.isArray(items) ? items : []

    let totalPurchaseCost = new Prisma.Decimal(0)
    for (const it of itemsList) {
      const itemCost = new Prisma.Decimal(Number(it.purchaseCost || it.quantity * it.unitCost || 0))
      totalPurchaseCost = totalPurchaseCost.plus(itemCost)
    }

    const purchaseNumber = `PUR-SYNC-${Date.now().toString().slice(-6)}`
    const purchase = await prisma.purchase.create({
      data: {
        businessId,
        branchId: String(branchId),
        supplierId: String(supplierId),
        purchaseNumber,
        purchaseDate: pDate,
        totalAmount: totalPurchaseCost,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        createdById: actorId,
      },
    })

    // Create purchase items, material lots, and update material stock
    for (const it of itemsList) {
      const qty = Number(it.quantity)
      const uCost = new Prisma.Decimal(Number(it.unitCost))
      const pCost = new Prisma.Decimal(Number(it.purchaseCost || qty * Number(it.unitCost)))

      const material = await prisma.material.findUnique({
        where: { id: String(it.materialId) },
      })

      if (!material) {
        throw new Error(`Material ${it.materialId} not found`)
      }

      const purchaseItem = await prisma.purchaseItem.create({
        data: {
          businessId,
          purchaseId: purchase.id,
          materialId: material.id,
          grossQuantity: new Prisma.Decimal(qty),
          usableQuantity: new Prisma.Decimal(qty),
          unitId: material.defaultUnitId,
          purchaseCost: pCost,
          unitCost: uCost,
        },
      })

      const lotCode = `LOT-SYNC-${Date.now().toString().slice(-6)}`
      await prisma.materialLot.create({
        data: {
          businessId,
          branchId: String(branchId),
          materialId: material.id,
          purchaseItemId: purchaseItem.id,
          lotNumber: lotCode,
          originalQuantity: new Prisma.Decimal(qty),
          remainingQuantity: new Prisma.Decimal(qty),
          unitId: material.defaultUnitId,
          totalAcquisitionCost: pCost,
          unitCost: uCost,
          receivedAt: pDate,
          status: 'AVAILABLE',
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'OFFLINE_PURCHASE_CREATE',
        entityType: 'PURCHASE',
        entityId: purchase.id,
        source: 'OFFLINE_SYNC',
        afterData: { purchaseId: purchase.id, itemsCount: itemsList.length },
      },
    })

    await prisma.syncOperation.update({
      where: { id: operationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    return {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      status: 'PROCESSED',
      operationId,
      data: { purchaseId: purchase.id },
    }
  }

  private async handleSalesOrderCreate(
    businessId: string,
    actorId: string,
    operationId: string,
    op: SyncOperationEnvelope
  ): Promise<ProcessOperationResult> {
    const { branchId, customerId, saleDate, items, paymentMethod, amountPaid } = op.payload
    const itemsList = Array.isArray(items) ? items : []

    // 1. Concurrent stock conflict check:
    // Verify whether authoritative stock is sufficient across finished inventory lots.
    for (const it of itemsList) {
      const productId = String(it.productId)
      const requestedQty = Number(it.quantity)

      const availableLots = await prisma.finishedInventoryLot.findMany({
        where: {
          businessId,
          productId,
          remainingQuantity: { gt: 0 },
          ...(branchId ? { branchId: String(branchId) } : {}),
        },
      })

      const totalAvailable = availableLots.reduce((acc, l) => acc + l.remainingQuantity, 0)

      if (totalAvailable < requestedQty) {
        // CONFLICT DETECTED!
        // Never silently produce negative authoritative stock.
        const conflict = await prisma.syncConflict.create({
          data: {
            businessId,
            syncOperationId: operationId,
            conflictType: 'INSUFFICIENT_STOCK',
            description: `Offline sale of product requested ${requestedQty} units, but only ${totalAvailable} units are available in authoritative stock.`,
            serverState: {
              productId,
              availableQuantity: totalAvailable,
              requestedQuantity: requestedQty,
            },
            submittedState: op.payload,
            status: 'OPEN',
          },
        })

        await prisma.syncOperation.update({
          where: { id: operationId },
          data: {
            syncStatus: 'CONFLICT',
          },
        })

        return {
          idempotencyKey: op.idempotencyKey,
          operationType: op.operationType,
          status: 'CONFLICT',
          operationId,
          conflictId: conflict.id,
          message: `Concurrent offline stock conflict: insufficient inventory for product ${productId}`,
        }
      }
    }

    // 2. Authoritative stock is sufficient! Perform FIFO stock deduction and create sale.
    const sDate = saleDate ? new Date(saleDate) : new Date(op.clientTimestamp)
    const saleNum = `SALE-SYNC-${Date.now().toString().slice(-6)}`

    let totalAmount = new Prisma.Decimal(0)
    for (const it of itemsList) {
      const itemTotal = new Prisma.Decimal(Number(it.unitPrice)).times(Number(it.quantity))
      totalAmount = totalAmount.plus(itemTotal)
    }

    const sale = await prisma.sale.create({
      data: {
        businessId,
        branchId: String(branchId),
        ...(customerId ? { customerId: String(customerId) } : {}),
        saleNumber: saleNum,
        saleDate: sDate,
        subtotal: totalAmount,
        discount: new Prisma.Decimal(0),
        totalAmount,
        paymentStatus: Number(amountPaid || 0) >= totalAmount.toNumber() ? 'PAID' : 'PARTIAL',
        saleStatus: 'COMPLETED',
        createdById: actorId,
      },
    })

    // Process each item and deduct FIFO inventory lots
    for (const it of itemsList) {
      const productId = String(it.productId)
      let remainingToDeduct = Number(it.quantity)
      const uPrice = new Prisma.Decimal(Number(it.unitPrice))

      const availableLots = await prisma.finishedInventoryLot.findMany({
        where: {
          businessId,
          productId,
          remainingQuantity: { gt: 0 },
          ...(branchId ? { branchId: String(branchId) } : {}),
        },
        orderBy: { productionDate: 'asc' }, // FIFO
      })

      let totalItemCOGS = new Prisma.Decimal(0)
      const allocations: { lotId: string; qty: number; unitCost: Prisma.Decimal }[] = []

      for (const lot of availableLots) {
        if (remainingToDeduct <= 0) break
        const deduct = Math.min(lot.remainingQuantity, remainingToDeduct)
        remainingToDeduct -= deduct

        await prisma.finishedInventoryLot.update({
          where: { id: lot.id },
          data: { remainingQuantity: { decrement: deduct } },
        })

        const lotCOGS = new Prisma.Decimal(lot.unitCost).times(deduct)
        totalItemCOGS = totalItemCOGS.plus(lotCOGS)
        allocations.push({ lotId: lot.id, qty: deduct, unitCost: lot.unitCost })
      }

      const avgUnitCost = allocations.length > 0 ? totalItemCOGS.div(Number(it.quantity)) : new Prisma.Decimal(0)

      const saleItem = await prisma.saleItem.create({
        data: {
          businessId,
          saleId: sale.id,
          productId,
          quantity: Number(it.quantity),
          unitPrice: uPrice,
          totalAmount: uPrice.times(Number(it.quantity)),
          unitCostSnapshot: avgUnitCost,
          totalCOGS: totalItemCOGS,
        },
      })

      for (const alloc of allocations) {
        await prisma.saleInventoryAllocation.create({
          data: {
            businessId,
            saleItemId: saleItem.id,
            finishedInventoryLotId: alloc.lotId,
            quantity: alloc.qty,
            unitCostSnapshot: alloc.unitCost,
            totalCost: alloc.unitCost.times(alloc.qty),
          },
        })
      }
    }

    // Optional payment recording
    if (Number(amountPaid || 0) > 0) {
      const paid = new Prisma.Decimal(Number(amountPaid))
      const payment = await prisma.payment.create({
        data: {
          businessId,
          ...(customerId ? { customerId: String(customerId) } : {}),
          saleId: sale.id,
          amount: paid,
          paymentMethod: (paymentMethod as any) || 'CASH',
          paymentDate: sDate,
          receivedById: actorId,
          status: 'COMPLETED',
        },
      })

      if (customerId) {
        await prisma.customerLedgerEntry.create({
          data: {
            businessId,
            customerId: String(customerId),
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            credit: paid,
            debit: new Prisma.Decimal(0),
            transactionDate: sDate,
            createdById: actorId,
          },
        })
      }
    }

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'OFFLINE_SALES_ORDER_CREATE',
        entityType: 'SALE',
        entityId: sale.id,
        source: 'OFFLINE_SYNC',
        afterData: { saleId: sale.id, totalAmount: totalAmount.toNumber() },
      },
    })

    await prisma.syncOperation.update({
      where: { id: operationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    return {
      idempotencyKey: op.idempotencyKey,
      operationType: op.operationType,
      status: 'PROCESSED',
      operationId,
      data: { saleId: sale.id, saleNumber: saleNum },
    }
  }

  // --------------------------------------------------------------------------
  // Conflict Resolution Workflow
  // --------------------------------------------------------------------------

  async resolveConflict(
    businessId: string,
    conflictId: string,
    actorId: string,
    input: ResolveConflictInput
  ) {
    const conflict = await prisma.syncConflict.findFirst({
      where: { id: conflictId, businessId },
    })

    if (!conflict) {
      throw new Error('Conflict not found or unauthorized')
    }

    if (conflict.status !== 'OPEN') {
      throw new Error(`Conflict is already ${conflict.status}`)
    }

    const { strategy, resolutionNotes, adjustedPayload } = input

    if (strategy === 'DISCARD' || strategy === 'REJECT') {
      await prisma.syncConflict.update({
        where: { id: conflict.id },
        data: {
          status: 'REJECTED',
          resolution: {
            strategy: 'REJECT',
            notes: resolutionNotes || 'Rejected by supervisor',
          },
          resolvedById: actorId,
          resolvedAt: new Date(),
        },
      })

      await prisma.syncOperation.update({
        where: { id: conflict.syncOperationId },
        data: {
          syncStatus: 'FAILED',
          errorDetails: { message: 'Operation rejected during conflict resolution' },
        },
      })

      return {
        conflictId: conflict.id,
        status: 'REJECTED',
        message: 'Conflict rejected and transaction discarded',
      }
    }

    // OVERWRITE or ADJUST:
    // Update conflict to RESOLVED and mark operation PROCESSED
    await prisma.syncConflict.update({
      where: { id: conflict.id },
      data: {
        status: 'RESOLVED',
        resolution: {
          strategy,
          notes: resolutionNotes || `Resolved using ${strategy}`,
          ...(adjustedPayload ? { adjustedPayload } : {}),
        },
        resolvedById: actorId,
        resolvedAt: new Date(),
      },
    })

    await prisma.syncOperation.update({
      where: { id: conflict.syncOperationId },
      data: {
        syncStatus: 'PROCESSED',
        serverProcessedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'RESOLVE_SYNC_CONFLICT',
        entityType: 'SYNC_CONFLICT',
        entityId: conflict.id,
        source: 'WEB',
        afterData: { strategy, notes: resolutionNotes },
      },
    })

    return {
      conflictId: conflict.id,
      status: 'RESOLVED',
      strategy,
      message: `Conflict successfully resolved using ${strategy}`,
    }
  }
}

export const syncService = new SyncService()
