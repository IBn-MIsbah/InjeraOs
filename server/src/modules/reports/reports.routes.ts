import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../auth/index.js'
import { validateQuery } from '../../middleware/validate-request.js'
import { reportFilterSchema } from './reports.schema.js'

export const reportsRouter: ExpressRouter = Router()

// All routes require authentication
reportsRouter.use(authenticate)

// ----------------------------------------------------
// 1. Comprehensive Financial Report (Section 15)
// ----------------------------------------------------
reportsRouter.get(
  '/financial',
  validateQuery(reportFilterSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { branchId, startDate, endDate } = req.query as any

    const saleWhere: any = { businessId, saleStatus: 'COMPLETED' }
    const expenseWhere: any = { businessId, status: 'RECORDED' }
    const paymentWhere: any = { businessId, status: 'COMPLETED' }
    const batchWhere: any = { businessId, status: 'COMPLETED' }

    if (branchId) {
      saleWhere.branchId = branchId
      expenseWhere.branchId = branchId
      batchWhere.branchId = branchId
    }

    if (startDate || endDate) {
      saleWhere.saleDate = {}
      expenseWhere.expenseDate = {}
      paymentWhere.paymentDate = {}
      batchWhere.productionDate = {}

      if (startDate) {
        const start = new Date(startDate)
        saleWhere.saleDate.gte = start
        expenseWhere.expenseDate.gte = start
        paymentWhere.paymentDate.gte = start
        batchWhere.productionDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        saleWhere.saleDate.lte = end
        expenseWhere.expenseDate.lte = end
        paymentWhere.paymentDate.lte = end
        batchWhere.productionDate.lte = end
      }
    }

    // 1. Sales & COGS
    const sales = await prisma.sale.findMany({
      where: saleWhere,
    })

    const saleIds = sales.map((s) => s.id)
    const saleItems =
      saleIds.length > 0
        ? await prisma.saleItem.findMany({
            where: { saleId: { in: saleIds } },
          })
        : []

    const grossSales = sales.reduce((sum, s) => sum + Number(s.subtotal), 0)
    const totalDiscounts = sales.reduce((sum, s) => sum + Number(s.discount), 0)
    const revenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
    const cogs = saleItems.reduce((sum, item) => sum + Number(item.totalCOGS), 0)
    const grossProfit = revenue - cogs
    const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    // 2. Operating Expenses
    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
    })

    const operatingExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // Breakdown by category
    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))]
    const categories =
      categoryIds.length > 0
        ? await prisma.expenseCategory.findMany({
            where: { id: { in: categoryIds } },
          })
        : []
    const catMap = new Map(categories.map((c) => [c.id, c.name]))

    const expensesByCategory: Record<string, number> = {}
    for (const exp of expenses) {
      const catName = catMap.get(exp.categoryId) || 'Uncategorized'
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(exp.amount)
    }

    // 3. Net Operating Profit & Margin
    const netOperatingProfit = grossProfit - operatingExpenses
    const netOperatingMarginPercent = revenue > 0 ? (netOperatingProfit / revenue) * 100 : 0

    // 4. Cash Collections & Accounts Receivable
    const payments = await prisma.payment.findMany({
      where: paymentWhere,
    })
    const cashCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Customer ledger balances for accounts receivable
    const ledgerEntries = await prisma.customerLedgerEntry.findMany({
      where: { businessId },
    })

    const balancesByCustomer: Record<string, number> = {}
    for (const entry of ledgerEntries) {
      balancesByCustomer[entry.customerId] =
        (balancesByCustomer[entry.customerId] || 0) + Number(entry.debit) - Number(entry.credit)
    }

    const accountsReceivable = Object.values(balancesByCustomer).reduce(
      (sum, bal) => sum + Math.max(0, bal),
      0
    )
    const customersWithDebtCount = Object.values(balancesByCustomer).filter((bal) => bal > 0).length

    // 5. Production Cost metrics in period
    const completedBatches = await prisma.productionBatch.findMany({
      where: batchWhere,
    })
    const totalAcceptedProduced = completedBatches.reduce(
      (sum, b) => sum + Number(b.acceptedOutput),
      0
    )

    const batchIds = completedBatches.map((b) => b.id)
    const costRecords =
      batchIds.length > 0
        ? await prisma.productionCostRecord.findMany({
            where: { productionBatchId: { in: batchIds } },
          })
        : []
    const totalProductionCost = costRecords.reduce((sum, c) => sum + Number(c.totalBatchCost), 0)
    const averageProductionCostPerUnit =
      totalAcceptedProduced > 0 ? totalProductionCost / totalAcceptedProduced : 0

    return res.status(200).json({
      data: {
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
          branchId: branchId || null,
        },
        profitability: {
          totalSalesCount: sales.length,
          grossSales,
          totalDiscounts,
          revenue,
          cogs,
          grossProfit,
          grossMarginPercent,
          operatingExpenses,
          expensesByCategory,
          netOperatingProfit,
          netOperatingMarginPercent,
        },
        cashFlowAndCredit: {
          cashCollected,
          accountsReceivable,
          customersWithDebtCount,
        },
        productionOutput: {
          totalBatchesCount: completedBatches.length,
          totalAcceptedProduced,
          totalProductionCost,
          averageProductionCostPerUnit,
        },
      },
    })
  }
)

// ----------------------------------------------------
// 2. Baker Productivity Report (Section 4.5 & 10)
// ----------------------------------------------------
reportsRouter.get(
  '/baker-productivity',
  validateQuery(reportFilterSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { branchId, startDate, endDate } = req.query as any

    const where: any = { businessId }
    if (branchId) where.branchId = branchId
    if (startDate || endDate) {
      where.operationalDate = {}
      if (startDate) where.operationalDate.gte = new Date(startDate)
      if (endDate) where.operationalDate.lte = new Date(endDate)
    }

    const records = await prisma.bakerProductionRecord.findMany({
      where,
      orderBy: { operationalDate: 'desc' },
    })

    const employeeIds = [...new Set(records.map((r) => r.employeeId))]
    const employees =
      employeeIds.length > 0
        ? await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
          })
        : []
    const empMap = new Map(employees.map((e) => [e.id, e]))

    // Aggregate by employee
    const productivityMap: Record<
      string,
      {
        employeeId: string
        employeeName: string
        employeeNumber: string
        recordCount: number
        totalQuantity: number
        acceptedQuantity: number
        rejectedQuantity: number
      }
    > = {}

    for (const rec of records) {
      const emp = empMap.get(rec.employeeId)
      if (!productivityMap[rec.employeeId]) {
        productivityMap[rec.employeeId] = {
          employeeId: rec.employeeId,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Baker',
          employeeNumber: emp?.employeeNumber || '',
          recordCount: 0,
          totalQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
        }
      }
      productivityMap[rec.employeeId]!.recordCount += 1
      productivityMap[rec.employeeId]!.totalQuantity += rec.totalProduced
      productivityMap[rec.employeeId]!.acceptedQuantity += rec.acceptedQuantity
      productivityMap[rec.employeeId]!.rejectedQuantity += rec.rejectedQuantity
    }

    const result = Object.values(productivityMap).map((item) => {
      const rejectionRate =
        item.totalQuantity > 0 ? (item.rejectedQuantity / item.totalQuantity) * 100 : 0
      return {
        ...item,
        rejectionRatePercent: Number(rejectionRate.toFixed(2)),
        yieldPercent: Number((100 - rejectionRate).toFixed(2)),
      }
    })

    return res.status(200).json({ data: result })
  }
)

// ----------------------------------------------------
// 3. Inventory Valuation Report (Section 13)
// ----------------------------------------------------
reportsRouter.get(
  '/inventory-valuation',
  validateQuery(reportFilterSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { branchId } = req.query as any

    const rawLotWhere: any = {
      businessId,
      remainingQuantity: { gt: 0 },
      ...(branchId ? { branchId } : {}),
    }

    const finishedLotWhere: any = {
      businessId,
      status: 'AVAILABLE',
      remainingQuantity: { gt: 0 },
      ...(branchId ? { branchId } : {}),
    }

    // 1. Raw Materials Lots
    const rawLots = await prisma.materialLot.findMany({
      where: rawLotWhere,
    })

    const materialIds = [...new Set(rawLots.map((l) => l.materialId))]
    const materials =
      materialIds.length > 0
        ? await prisma.material.findMany({
            where: { id: { in: materialIds } },
          })
        : []
    const matMap = new Map(materials.map((m) => [m.id, m]))

    const rawValuationByMaterial: Record<
      string,
      {
        materialId: string
        materialName: string
        totalRemainingQuantity: number
        totalValuation: number
      }
    > = {}

    let totalRawValuation = 0

    for (const lot of rawLots) {
      const mat = matMap.get(lot.materialId)
      const matName = mat?.name || 'Raw Material'
      const rem = Number(lot.remainingQuantity)
      const cost = Number(lot.unitCost)
      const lotVal = rem * cost
      totalRawValuation += lotVal

      if (!rawValuationByMaterial[lot.materialId]) {
        rawValuationByMaterial[lot.materialId] = {
          materialId: lot.materialId,
          materialName: matName,
          totalRemainingQuantity: 0,
          totalValuation: 0,
        }
      }
      rawValuationByMaterial[lot.materialId]!.totalRemainingQuantity += rem
      rawValuationByMaterial[lot.materialId]!.totalValuation += lotVal
    }

    // 2. Finished Goods Lots
    const finishedLots = await prisma.finishedInventoryLot.findMany({
      where: finishedLotWhere,
    })

    const productIds = [...new Set(finishedLots.map((l) => l.productId))]
    const products =
      productIds.length > 0
        ? await prisma.finishedProduct.findMany({
            where: { id: { in: productIds } },
          })
        : []
    const prodMap = new Map(products.map((p) => [p.id, p]))

    const finishedValuationByProduct: Record<
      string,
      {
        productId: string
        productName: string
        totalRemainingQuantity: number
        totalValuation: number
      }
    > = {}

    let totalFinishedValuation = 0

    for (const lot of finishedLots) {
      const prod = prodMap.get(lot.productId)
      const prodName = prod?.name || 'Finished Product'
      const rem = lot.remainingQuantity
      const cost = Number(lot.unitCost)
      const lotVal = rem * cost
      totalFinishedValuation += lotVal

      if (!finishedValuationByProduct[lot.productId]) {
        finishedValuationByProduct[lot.productId] = {
          productId: lot.productId,
          productName: prodName,
          totalRemainingQuantity: 0,
          totalValuation: 0,
        }
      }
      finishedValuationByProduct[lot.productId]!.totalRemainingQuantity += rem
      finishedValuationByProduct[lot.productId]!.totalValuation += lotVal
    }

    const totalInventoryValuation = totalRawValuation + totalFinishedValuation

    return res.status(200).json({
      data: {
        totalInventoryValuation,
        rawMaterials: {
          totalValuation: totalRawValuation,
          materials: Object.values(rawValuationByMaterial),
        },
        finishedGoods: {
          totalValuation: totalFinishedValuation,
          products: Object.values(finishedValuationByProduct),
        },
      },
    })
  }
)

// ----------------------------------------------------
// 4. Executive Dashboard Summary (Section 16)
// ----------------------------------------------------
reportsRouter.get('/dashboard-summary', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  if (!businessId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    todaySales,
    monthSales,
    activeBatchesCount,
    pendingDeliveriesCount,
    customers,
    ledgerEntries,
    expensesThisMonth,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        businessId,
        saleStatus: 'COMPLETED',
        saleDate: { gte: todayStart },
      },
    }),
    prisma.sale.findMany({
      where: {
        businessId,
        saleStatus: 'COMPLETED',
        saleDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
    prisma.productionBatch.count({
      where: {
        businessId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
    }),
    prisma.delivery.count({
      where: {
        businessId,
        status: 'PENDING',
      },
    }),
    prisma.customer.findMany({
      where: { businessId, status: 'ACTIVE' },
    }),
    prisma.customerLedgerEntry.findMany({
      where: { businessId },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        status: 'RECORDED',
        expenseDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
  ])

  // Customer debt
  const balancesByCustomer: Record<string, number> = {}
  for (const entry of ledgerEntries) {
    balancesByCustomer[entry.customerId] =
      (balancesByCustomer[entry.customerId] || 0) + Number(entry.debit) - Number(entry.credit)
  }
  const totalReceivables = Object.values(balancesByCustomer).reduce(
    (sum, bal) => sum + Math.max(0, bal),
    0
  )

  const todayRevenue = todaySales.reduce((s, item) => s + Number(item.totalAmount), 0)
  const monthRevenue = monthSales.reduce((s, item) => s + Number(item.totalAmount), 0)
  const monthOperatingExpenses = expensesThisMonth.reduce((s, item) => s + Number(item.amount), 0)

  return res.status(200).json({
    data: {
      today: {
        revenue: todayRevenue,
        orderCount: todaySales.length,
      },
      currentMonth: {
        revenue: monthRevenue,
        orderCount: monthSales.length,
        operatingExpenses: monthOperatingExpenses,
      },
      operations: {
        activeBatchesCount,
        pendingDeliveriesCount,
        activeCustomersCount: customers.length,
        totalReceivables,
      },
    },
  })
})
