import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireRole } from '../auth/index.js'
import { validateBody, validateQuery } from '../../middleware/validate-request.js'
import {
  createCustomerSchema,
  updateCustomerSchema,
  createSaleSchema,
  recordPaymentSchema,
  recordLedgerAdjustmentSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
  getSalesQuerySchema,
  getDeliveriesQuerySchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CreateSaleInput,
  type RecordPaymentInput,
  type RecordLedgerAdjustmentInput,
  type CreateDeliveryInput,
  type UpdateDeliveryStatusInput,
} from './sales.schema.js'

export const salesRouter: ExpressRouter = Router()

// All routes require authentication
salesRouter.use(authenticate)

// Helper: Calculate customer derived balance from append-only ledger entries
async function getCustomerDerivedBalance(businessId: string, customerId: string): Promise<number> {
  const result = await prisma.customerLedgerEntry.aggregate({
    where: { businessId, customerId },
    _sum: {
      debit: true,
      credit: true,
    },
  })

  const totalDebit = Number(result._sum.debit ?? 0)
  const totalCredit = Number(result._sum.credit ?? 0)
  return Number((totalDebit - totalCredit).toFixed(4))
}

// ==========================================
// 1. Customer Management & Ledger
// ==========================================

// List customers with derived balance
salesRouter.get(
  '/customers',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const status = req.query.status as string | undefined

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { name: 'asc' },
    })

    // Fetch derived balances for all customers in parallel
    const balances = await Promise.all(
      customers.map((c) => getCustomerDerivedBalance(businessId, c.id))
    )

    const enriched = customers.map((c, i) => {
      const derivedBalance = balances[i] ?? 0
      const creditLimit = c.creditLimit ? Number(c.creditLimit) : null
      const isOverCreditLimit = creditLimit !== null && derivedBalance > creditLimit

      return {
        ...c,
        creditLimit,
        derivedBalance,
        isOverCreditLimit,
      }
    })

    return res.status(200).json({ data: enriched })
  }
)

// Create customer
salesRouter.post(
  '/customers',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON'),
  validateBody(createCustomerSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateCustomerInput

    const customer = await prisma.customer.create({
      data: {
        businessId,
        name: input.name,
        phone: input.phone ?? null,
        address: input.address ?? null,
        customerType: input.customerType,
        creditLimit: input.creditLimit !== undefined && input.creditLimit !== null ? input.creditLimit : null,
      },
    })

    return res.status(201).json({
      data: {
        ...customer,
        creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
        derivedBalance: 0,
        isOverCreditLimit: false,
      },
    })
  }
)

// Get single customer with ledger summary
salesRouter.get(
  '/customers/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
    })

    if (!customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' })
    }

    const derivedBalance = await getCustomerDerivedBalance(businessId, id)
    const salesCount = await prisma.sale.count({ where: { businessId, customerId: id } })
    const creditLimit = customer.creditLimit ? Number(customer.creditLimit) : null

    return res.status(200).json({
      data: {
        ...customer,
        creditLimit,
        derivedBalance,
        isOverCreditLimit: creditLimit !== null && derivedBalance > creditLimit,
        salesCount,
      },
    })
  }
)

// Update customer
salesRouter.patch(
  '/customers/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON'),
  validateBody(updateCustomerSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as UpdateCustomerInput

    const existing = await prisma.customer.findFirst({
      where: { id, businessId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' })
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address ?? null } : {}),
        ...(input.customerType ? { customerType: input.customerType } : {}),
        ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    })

    const derivedBalance = await getCustomerDerivedBalance(businessId, id)
    const creditLimit = updated.creditLimit ? Number(updated.creditLimit) : null

    return res.status(200).json({
      data: {
        ...updated,
        creditLimit,
        derivedBalance,
        isOverCreditLimit: creditLimit !== null && derivedBalance > creditLimit,
      },
    })
  }
)

// Customer Ledger Statement (running balance)
salesRouter.get(
  '/customers/:id/statement',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
    })

    if (!customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' })
    }

    const entries = await prisma.customerLedgerEntry.findMany({
      where: { businessId, customerId: id },
      orderBy: { transactionDate: 'asc' },
    })

    let runningBalance = 0
    const enrichedEntries = entries.map((entry) => {
      const debit = Number(entry.debit)
      const credit = Number(entry.credit)
      runningBalance = Number((runningBalance + debit - credit).toFixed(4))

      return {
        ...entry,
        debit,
        credit,
        runningBalance,
      }
    })

    return res.status(200).json({
      data: {
        customer: {
          ...customer,
          creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
          currentBalance: runningBalance,
        },
        entries: enrichedEntries,
      },
    })
  }
)

// Customer Ledger Auditable Adjustment
salesRouter.post(
  '/customers/:id/ledger-adjustment',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(recordLedgerAdjustmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const customerId = req.params.id as string
    const input = req.body as RecordLedgerAdjustmentInput

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId },
    })

    if (!customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' })
    }

    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date()
    const debit = input.direction === 'DEBIT' ? input.amount : 0
    const credit = input.direction === 'CREDIT' ? input.amount : 0

    const entry = await prisma.customerLedgerEntry.create({
      data: {
        businessId,
        customerId,
        transactionType: 'ADJUSTMENT',
        referenceType: 'ADJUSTMENT',
        referenceId: customerId,
        debit,
        credit,
        transactionDate,
        description: input.description,
        createdById: userId,
      },
    })

    const newBalance = await getCustomerDerivedBalance(businessId, customerId)

    return res.status(201).json({
      message: 'Ledger adjustment recorded successfully.',
      data: {
        entry: {
          ...entry,
          debit: Number(entry.debit),
          credit: Number(entry.credit),
        },
        newDerivedBalance: newBalance,
      },
    })
  }
)

// ==========================================
// 2. Sales Orders & FIFO Lot Allocation
// ==========================================

// Create completed sale with automatic FIFO lot allocation
salesRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  validateBody(createSaleSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as CreateSaleInput

    // 1. Verify Unique Sale Number
    const existing = await prisma.sale.findFirst({
      where: { businessId, saleNumber: input.saleNumber },
    })

    if (existing) {
      return res.status(409).json({
        error: 'DUPLICATE_SALE_NUMBER',
        message: `Sale number '${input.saleNumber}' is already in use.`,
      })
    }

    // 2. Verify Branch
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, businessId },
    })

    if (!branch) {
      return res.status(404).json({ error: 'BRANCH_NOT_FOUND', message: 'Branch not found.' })
    }

    // 3. Verify Customer & Credit Limit if credit sale
    let customer: any = null
    if (input.customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: input.customerId, businessId },
      })

      if (!customer) {
        return res.status(404).json({ error: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' })
      }
    }

    // 4. Inventory Lot Allocation (FIFO & Availability Check First)
    const now = new Date()
    const itemAllocations: {
      productId: string
      quantity: number
      unitPrice: number
      discount: number
      totalAmount: number
      unitCostSnapshot: number
      totalCOGS: number
      allocations: {
        lotId: string
        quantity: number
        unitCost: number
        totalCost: number
      }[]
    }[] = []

    for (const item of input.items) {
      const product = await prisma.finishedProduct.findFirst({
        where: { id: item.productId, businessId },
      })

      if (!product) {
        return res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product ${item.productId} not found.`,
        })
      }

      let requiredQuantity = item.quantity
      const allocations: { lotId: string; quantity: number; unitCost: number; totalCost: number }[] = []

      if (item.specificLotAllocations && item.specificLotAllocations.length > 0) {
        // Explicit Lot Allocation
        for (const spec of item.specificLotAllocations) {
          const lot = await prisma.finishedInventoryLot.findFirst({
            where: { id: spec.finishedInventoryLotId, businessId, productId: item.productId },
          })

          if (!lot || lot.remainingQuantity < spec.quantity) {
            return res.status(400).json({
              error: 'INSUFFICIENT_FINISHED_STOCK',
              message: `Lot ${spec.finishedInventoryLotId} has insufficient stock for allocation.`,
            })
          }

          const unitCost = Number(lot.unitCost)
          allocations.push({
            lotId: lot.id,
            quantity: spec.quantity,
            unitCost,
            totalCost: Number((spec.quantity * unitCost).toFixed(4)),
          })
        }
      } else {
        // Automatic FIFO Allocation: oldest unexpired available lots first
        const availableLots = await prisma.finishedInventoryLot.findMany({
          where: {
            businessId,
            productId: item.productId,
            status: 'AVAILABLE',
            remainingQuantity: { gt: 0 },
            OR: [{ expiryAt: null }, { expiryAt: { gt: now } }],
          },
          orderBy: { productionDate: 'asc' },
        })

        const totalAvailable = availableLots.reduce((sum, l) => sum + l.remainingQuantity, 0)
        if (totalAvailable < requiredQuantity) {
          return res.status(400).json({
            error: 'INSUFFICIENT_FINISHED_STOCK',
            message: `Insufficient stock for product '${product.name}'. Available: ${totalAvailable} pcs, Requested: ${requiredQuantity} pcs.`,
          })
        }

        for (const lot of availableLots) {
          if (requiredQuantity <= 0) break
          const allocQty = Math.min(lot.remainingQuantity, requiredQuantity)
          const unitCost = Number(lot.unitCost)

          allocations.push({
            lotId: lot.id,
            quantity: allocQty,
            unitCost,
            totalCost: Number((allocQty * unitCost).toFixed(4)),
          })

          requiredQuantity -= allocQty
        }
      }

      const totalItemCOGS = Number(allocations.reduce((sum, a) => sum + a.totalCost, 0).toFixed(4))
      const unitCostSnapshot = Number((totalItemCOGS / item.quantity).toFixed(4))
      const itemTotal = Number((item.quantity * item.unitPrice - (item.discount ?? 0)).toFixed(4))

      itemAllocations.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        totalAmount: itemTotal,
        unitCostSnapshot,
        totalCOGS: totalItemCOGS,
        allocations,
      })
    }

    // 5. Calculate Subtotal & Line Item Costs
    let subtotal = 0
    for (const item of itemAllocations) {
      subtotal += item.totalAmount
    }
    subtotal = Number(subtotal.toFixed(4))
    const totalDiscount = Number((input.discount ?? 0).toFixed(4))
    const totalAmount = Number((subtotal - totalDiscount).toFixed(4))

    const paymentAmount = input.payment ? Number(input.payment.amount) : 0
    const unpaidAmount = Number(Math.max(0, totalAmount - paymentAmount).toFixed(4))

    // 6. Check Credit Limit Invariant
    if (unpaidAmount > 0) {
      if (!customer) {
        return res.status(400).json({
          error: 'CUSTOMER_REQUIRED_FOR_CREDIT',
          message: 'A registered customer is required for unpaid or partial credit sales.',
        })
      }

      if (customer.creditLimit !== null) {
        const currentBalance = await getCustomerDerivedBalance(businessId, customer.id)
        const projectedBalance = Number((currentBalance + unpaidAmount).toFixed(4))
        const limit = Number(customer.creditLimit)

        if (projectedBalance > limit) {
          return res.status(400).json({
            error: 'CREDIT_LIMIT_EXCEEDED',
            message: `Credit limit exceeded. Current outstanding: ${currentBalance.toFixed(2)} ETB, New credit: ${unpaidAmount.toFixed(2)} ETB, Credit limit: ${limit.toFixed(2)} ETB.`,
          })
        }
      }
    }

    // 6. Payment Status Determination
    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
    if (paymentAmount >= totalAmount) {
      paymentStatus = 'PAID'
    } else if (paymentAmount > 0) {
      paymentStatus = 'PARTIAL'
    }

    const saleDate = input.saleDate ? new Date(input.saleDate) : new Date()

    // 7. Atomic Execution Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          branchId: input.branchId,
          customerId: input.customerId ?? null,
          saleNumber: input.saleNumber,
          saleDate,
          subtotal,
          discount: totalDiscount,
          totalAmount,
          paymentStatus,
          saleStatus: 'COMPLETED',
          createdById: userId,
        },
      })

      // Create Sale Items & Allocations & Movement records
      for (const item of itemAllocations) {
        const saleItem = await tx.saleItem.create({
          data: {
            businessId,
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalAmount: item.totalAmount,
            unitCostSnapshot: item.unitCostSnapshot,
            totalCOGS: item.totalCOGS,
          },
        })

        for (const alloc of item.allocations) {
          // Record allocation
          await tx.saleInventoryAllocation.create({
            data: {
              businessId,
              saleItemId: saleItem.id,
              finishedInventoryLotId: alloc.lotId,
              quantity: alloc.quantity,
              unitCostSnapshot: alloc.unitCost,
              totalCost: alloc.totalCost,
            },
          })

          // Deduct from FinishedInventoryLot
          const lot = await tx.finishedInventoryLot.findUniqueOrThrow({
            where: { id: alloc.lotId },
          })

          const newRemaining = lot.remainingQuantity - alloc.quantity
          await tx.finishedInventoryLot.update({
            where: { id: alloc.lotId },
            data: {
              remainingQuantity: newRemaining,
              status: newRemaining === 0 ? 'DEPLETED' : lot.status,
            },
          })

          // Record Movement (SALE_OUT)
          await tx.finishedStockMovement.create({
            data: {
              businessId,
              finishedInventoryLotId: alloc.lotId,
              movementType: 'SALE_OUT',
              quantity: alloc.quantity,
              referenceType: 'SALE',
              referenceId: sale.id,
              createdById: userId,
              occurredAt: saleDate,
            },
          })
        }
      }

      // Record Upfront Payment if provided
      let paymentRecord: any = null
      if (input.payment && paymentAmount > 0) {
        paymentRecord = await tx.payment.create({
          data: {
            businessId,
            customerId: input.customerId ?? null,
            saleId: sale.id,
            amount: paymentAmount,
            paymentMethod: input.payment.paymentMethod,
            paymentDate: saleDate,
            referenceNumber: input.payment.referenceNumber ?? null,
            receivedById: userId,
            status: 'COMPLETED',
          },
        })
      }

      // Customer Ledger Entries (Append-only)
      if (input.customerId) {
        // Debit the customer account for the total sale
        await tx.customerLedgerEntry.create({
          data: {
            businessId,
            customerId: input.customerId,
            transactionType: 'SALE',
            referenceType: 'SALE',
            referenceId: sale.id,
            debit: totalAmount,
            credit: 0,
            transactionDate: saleDate,
            description: `Sale #${sale.saleNumber}`,
            createdById: userId,
          },
        })

        // If payment was made upfront, record payment credit on customer account
        if (paymentRecord) {
          await tx.customerLedgerEntry.create({
            data: {
              businessId,
              customerId: input.customerId,
              transactionType: 'PAYMENT',
              referenceType: 'PAYMENT',
              referenceId: paymentRecord.id,
              debit: 0,
              credit: paymentAmount,
              transactionDate: saleDate,
              description: `Payment for Sale #${sale.saleNumber} (${input.payment!.paymentMethod})`,
              createdById: userId,
            },
          })
        }
      }

      return {
        sale,
        payment: paymentRecord,
      }
    })

    return res.status(201).json({
      message: 'Sale completed successfully with FIFO lot allocation and ledger entry.',
      data: {
        ...result.sale,
        subtotal: Number(result.sale.subtotal),
        discount: Number(result.sale.discount),
        totalAmount: Number(result.sale.totalAmount),
        payment: result.payment
          ? {
              ...result.payment,
              amount: Number(result.payment.amount),
            }
          : null,
      },
    })
  }
)

// List sales
salesRouter.get(
  '/',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  validateQuery(getSalesQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const query = req.query as any

    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
        ...(query.saleStatus ? { saleStatus: query.saleStatus } : {}),
      },
      orderBy: { saleDate: 'desc' },
    })

    // Fetch customer and branch names
    const [customers, branches] = await Promise.all([
      prisma.customer.findMany({ where: { businessId } }),
      prisma.branch.findMany({ where: { businessId } }),
    ])
    const customerMap = new Map(customers.map((c) => [c.id, c.name]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const enriched = sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      totalAmount: Number(s.totalAmount),
      customerName: s.customerId ? customerMap.get(s.customerId) ?? 'Customer' : 'Walk-in Customer',
      branchName: branchMap.get(s.branchId) ?? 'Branch',
    }))

    return res.status(200).json({ data: enriched })
  }
)

// Get sale detail with items, lot allocations, and payments
salesRouter.get(
  '/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string

    const sale = await prisma.sale.findFirst({
      where: { id, businessId },
    })

    if (!sale) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Sale not found.' })
    }

    const [items, payments, allocations, products, customer, branch] = await Promise.all([
      prisma.saleItem.findMany({ where: { saleId: id, businessId } }),
      prisma.payment.findMany({ where: { saleId: id, businessId } }),
      prisma.saleInventoryAllocation.findMany({
        where: { businessId, saleItemId: { in: (await prisma.saleItem.findMany({ where: { saleId: id } })).map((i) => i.id) } },
      }),
      prisma.finishedProduct.findMany({ where: { businessId } }),
      sale.customerId ? prisma.customer.findFirst({ where: { id: sale.customerId, businessId } }) : null,
      prisma.branch.findFirst({ where: { id: sale.branchId, businessId } }),
    ])

    const productMap = new Map(products.map((p) => [p.id, p]))

    const enrichedItems = items.map((item) => {
      const itemAllocations = allocations.filter((a) => a.saleItemId === item.id)
      const product = productMap.get(item.productId)

      return {
        ...item,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        totalAmount: Number(item.totalAmount),
        unitCostSnapshot: Number(item.unitCostSnapshot),
        totalCOGS: Number(item.totalCOGS),
        productName: product?.name ?? 'Injera',
        productCode: product?.productCode ?? 'CODE',
        productSize: product?.size ?? null,
        allocations: itemAllocations.map((a) => ({
          ...a,
          unitCostSnapshot: Number(a.unitCostSnapshot),
          totalCost: Number(a.totalCost),
        })),
      }
    })

    const totalCOGS = enrichedItems.reduce((sum, item) => sum + item.totalCOGS, 0)
    const grossProfit = Number((Number(sale.totalAmount) - totalCOGS).toFixed(4))
    const grossMarginPercent = Number(sale.totalAmount) > 0 ? Number(((grossProfit / Number(sale.totalAmount)) * 100).toFixed(2)) : 0

    return res.status(200).json({
      data: {
        ...sale,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        totalAmount: Number(sale.totalAmount),
        customerName: customer?.name ?? 'Walk-in Customer',
        customerPhone: customer?.phone ?? null,
        branchName: branch?.name ?? 'Branch',
        items: enrichedItems,
        payments: payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
        totalCOGS,
        grossProfit,
        grossMarginPercent,
      },
    })
  }
)

// Cancel sale with inventory reversal & ledger reversal
salesRouter.post(
  '/:id/cancel',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const id = req.params.id as string

    const sale = await prisma.sale.findFirst({
      where: { id, businessId },
    })

    if (!sale) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Sale not found.' })
    }

    if (sale.saleStatus === 'CANCELLED') {
      return res.status(400).json({
        error: 'ALREADY_CANCELLED',
        message: 'This sale has already been cancelled.',
      })
    }

    const items = await prisma.saleItem.findMany({ where: { saleId: id, businessId } })
    const allocations = await prisma.saleInventoryAllocation.findMany({
      where: { businessId, saleItemId: { in: items.map((i) => i.id) } },
    })

    const now = new Date()

    await prisma.$transaction(async (tx) => {
      // 1. Return stock to allocated lots
      for (const alloc of allocations) {
        const lot = await tx.finishedInventoryLot.findUniqueOrThrow({
          where: { id: alloc.finishedInventoryLotId },
        })

        const newRemaining = lot.remainingQuantity + alloc.quantity
        await tx.finishedInventoryLot.update({
          where: { id: alloc.finishedInventoryLotId },
          data: {
            remainingQuantity: newRemaining,
            status: 'AVAILABLE', // Re-open lot
          },
        })

        // Movement record for reversal
        await tx.finishedStockMovement.create({
          data: {
            businessId,
            finishedInventoryLotId: alloc.finishedInventoryLotId,
            movementType: 'ADJUSTMENT_IN',
            quantity: alloc.quantity,
            referenceType: 'SALE_REVERSAL',
            referenceId: sale.id,
            createdById: userId,
            occurredAt: now,
          },
        })
      }

      // 2. Customer Ledger Reversal
      if (sale.customerId) {
        // Reverse sale debit by crediting customer account
        await tx.customerLedgerEntry.create({
          data: {
            businessId,
            customerId: sale.customerId,
            transactionType: 'REVERSAL',
            referenceType: 'SALE_REVERSAL',
            referenceId: sale.id,
            debit: 0,
            credit: sale.totalAmount,
            transactionDate: now,
            description: `Reversal of cancelled Sale #${sale.saleNumber}`,
            createdById: userId,
          },
        })
      }

      // 3. Mark sale CANCELLED
      await tx.sale.update({
        where: { id },
        data: { saleStatus: 'CANCELLED' },
      })
    })

    return res.status(200).json({
      message: 'Sale cancelled and inventory successfully returned to stock.',
    })
  }
)

// ==========================================
// 3. Payments & Repayments
// ==========================================

// Record payment (e.g. debt repayment or partial payment against a sale)
salesRouter.post(
  '/payments',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  validateBody(recordPaymentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as RecordPaymentInput

    if (!input.customerId && !input.saleId) {
      return res.status(400).json({
        error: 'CUSTOMER_OR_SALE_REQUIRED',
        message: 'A payment must be linked to a customer or a sale.',
      })
    }

    let customerId = input.customerId
    let sale: any = null

    if (input.saleId) {
      sale = await prisma.sale.findFirst({
        where: { id: input.saleId, businessId },
      })

      if (!sale) {
        return res.status(404).json({ error: 'SALE_NOT_FOUND', message: 'Sale not found.' })
      }

      if (!customerId && sale.customerId) {
        customerId = sale.customerId
      }
    }

    if (customerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
      })
      if (!cust) {
        return res.status(404).json({ error: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' })
      }
    }

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date()

    const payment = await prisma.$transaction(async (tx) => {
      const rec = await tx.payment.create({
        data: {
          businessId,
          customerId: customerId ?? null,
          saleId: input.saleId ?? null,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          paymentDate,
          referenceNumber: input.referenceNumber ?? null,
          receivedById: userId,
          status: 'COMPLETED',
        },
      })

      // If customer linked, add credit to customer ledger
      if (customerId) {
        await tx.customerLedgerEntry.create({
          data: {
            businessId,
            customerId,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: rec.id,
            debit: 0,
            credit: input.amount,
            transactionDate: paymentDate,
            description: input.saleId
              ? `Repayment for Sale #${sale?.saleNumber ?? ''}`
              : `Customer account payment (${input.paymentMethod})`,
            createdById: userId,
          },
        })
      }

      // If sale linked, update sale payment status
      if (sale) {
        const allPayments = await tx.payment.findMany({
          where: { saleId: sale.id, businessId },
        })
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        const saleTotal = Number(sale.totalAmount)

        let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
        if (totalPaid >= saleTotal) {
          newStatus = 'PAID'
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL'
        }

        await tx.sale.update({
          where: { id: sale.id },
          data: { paymentStatus: newStatus },
        })
      }

      return rec
    })

    return res.status(201).json({
      message: 'Payment recorded successfully.',
      data: {
        ...payment,
        amount: Number(payment.amount),
      },
    })
  }
)

// List payments
salesRouter.get(
  '/payments',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId

    const payments = await prisma.payment.findMany({
      where: { businessId },
      orderBy: { paymentDate: 'desc' },
    })

    const [customers, sales] = await Promise.all([
      prisma.customer.findMany({ where: { businessId } }),
      prisma.sale.findMany({ where: { businessId } }),
    ])
    const customerMap = new Map(customers.map((c) => [c.id, c.name]))
    const saleMap = new Map(sales.map((s) => [s.id, s.saleNumber]))

    const enriched = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      customerName: p.customerId ? customerMap.get(p.customerId) ?? 'Customer' : 'Walk-in',
      saleNumber: p.saleId ? saleMap.get(p.saleId) ?? null : null,
    }))

    return res.status(200).json({ data: enriched })
  }
)

// ==========================================
// 4. Delivery & Distribution
// ==========================================

// Schedule delivery
salesRouter.post(
  '/deliveries',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON'),
  validateBody(createDeliverySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateDeliveryInput

    const [branch, customer, employee] = await Promise.all([
      prisma.branch.findFirst({ where: { id: input.branchId, businessId } }),
      prisma.customer.findFirst({ where: { id: input.customerId, businessId } }),
      prisma.employee.findFirst({ where: { id: input.deliveryEmployeeId, businessId } }),
    ])

    if (!branch) return res.status(404).json({ error: 'BRANCH_NOT_FOUND', message: 'Branch not found.' })
    if (!customer) return res.status(404).json({ error: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' })
    if (!employee) return res.status(404).json({ error: 'EMPLOYEE_NOT_FOUND', message: 'Delivery driver not found.' })

    const delivery = await prisma.$transaction(async (tx) => {
      const del = await tx.delivery.create({
        data: {
          businessId,
          branchId: input.branchId,
          customerId: input.customerId,
          saleId: input.saleId ?? null,
          deliveryEmployeeId: input.deliveryEmployeeId,
          deliveryDate: new Date(input.deliveryDate),
          status: 'PENDING',
          notes: input.notes ?? null,
        },
      })

      for (const item of input.items) {
        await tx.deliveryItem.create({
          data: {
            businessId,
            deliveryId: del.id,
            productId: item.productId,
            quantity: item.quantity,
            deliveredQuantity: 0,
          },
        })
      }

      return del
    })

    return res.status(201).json({ data: delivery })
  }
)

// List deliveries
salesRouter.get(
  '/deliveries',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  validateQuery(getDeliveriesQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const query = req.query as any

    const deliveries = await prisma.delivery.findMany({
      where: {
        businessId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.deliveryEmployeeId ? { deliveryEmployeeId: query.deliveryEmployeeId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { deliveryDate: 'desc' },
    })

    const [customers, employees, branches] = await Promise.all([
      prisma.customer.findMany({ where: { businessId } }),
      prisma.employee.findMany({ where: { businessId } }),
      prisma.branch.findMany({ where: { businessId } }),
    ])

    const customerMap = new Map(customers.map((c) => [c.id, c]))
    const employeeMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const enriched = deliveries.map((d) => {
      const cust = customerMap.get(d.customerId)
      return {
        ...d,
        customerName: cust?.name ?? 'Customer',
        customerPhone: cust?.phone ?? null,
        deliveryAddress: cust?.address ?? 'No address set',
        driverName: employeeMap.get(d.deliveryEmployeeId) ?? 'Driver',
        branchName: branchMap.get(d.branchId) ?? 'Branch',
      }
    })

    return res.status(200).json({ data: enriched })
  }
)

// Get single delivery detail
salesRouter.get(
  '/deliveries/:id',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON', 'CASHIER'),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string

    const delivery = await prisma.delivery.findFirst({
      where: { id, businessId },
    })

    if (!delivery) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Delivery not found.' })
    }

    const [items, customer, employee, branch, products] = await Promise.all([
      prisma.deliveryItem.findMany({ where: { deliveryId: id, businessId } }),
      prisma.customer.findFirst({ where: { id: delivery.customerId, businessId } }),
      prisma.employee.findFirst({ where: { id: delivery.deliveryEmployeeId, businessId } }),
      prisma.branch.findFirst({ where: { id: delivery.branchId, businessId } }),
      prisma.finishedProduct.findMany({ where: { businessId } }),
    ])

    const productMap = new Map(products.map((p) => [p.id, p]))

    return res.status(200).json({
      data: {
        ...delivery,
        customerName: customer?.name ?? 'Customer',
        customerPhone: customer?.phone ?? null,
        deliveryAddress: customer?.address ?? null,
        driverName: employee ? `${employee.firstName} ${employee.lastName}` : 'Driver',
        branchName: branch?.name ?? 'Branch',
        items: items.map((it) => {
          const prod = productMap.get(it.productId)
          return {
            ...it,
            productName: prod?.name ?? 'Injera',
            productCode: prod?.productCode ?? 'CODE',
          }
        }),
      },
    })
  }
)

// Update delivery status and confirmed delivered quantities
salesRouter.patch(
  '/deliveries/:id/status',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SALESPERSON'),
  validateBody(updateDeliveryStatusSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const id = req.params.id as string
    const input = req.body as UpdateDeliveryStatusInput

    const delivery = await prisma.delivery.findFirst({
      where: { id, businessId },
    })

    if (!delivery) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Delivery not found.' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const del = await tx.delivery.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      })

      if (input.items && input.items.length > 0) {
        for (const it of input.items) {
          await tx.deliveryItem.update({
            where: { id: it.deliveryItemId },
            data: { deliveredQuantity: it.deliveredQuantity },
          })
        }
      }

      return del
    })

    return res.status(200).json({ data: updated })
  }
)
