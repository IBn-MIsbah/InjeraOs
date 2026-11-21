import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../auth/index.js'
import { validateBody, validateQuery } from '../../middleware/validate-request.js'
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  getExpensesQuerySchema,
  type CreateExpenseCategoryInput,
  type UpdateExpenseCategoryInput,
  type CreateExpenseInput,
} from './expenses.schema.js'

export const expensesRouter: ExpressRouter = Router()

// All routes require authentication
expensesRouter.use(authenticate)

// ----------------------------------------------------
// Expense Categories
// ----------------------------------------------------

expensesRouter.get('/categories', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  if (!businessId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const categories = await prisma.expenseCategory.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  })

  return res.status(200).json({ data: categories })
})

expensesRouter.post(
  '/categories',
  validateBody(createExpenseCategorySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { name, categoryType, isActive } = req.body as CreateExpenseCategoryInput

    const existing = await prisma.expenseCategory.findUnique({
      where: {
        businessId_name: {
          businessId,
          name,
        },
      },
    })

    if (existing) {
      return res.status(409).json({ message: 'Expense category with this name already exists' })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        businessId,
        name,
        categoryType,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return res.status(201).json({
      message: 'Expense category created successfully',
      data: category,
    })
  }
)

expensesRouter.patch(
  '/categories/:id',
  validateBody(updateExpenseCategorySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const id = String(req.params.id)

    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const category = await prisma.expenseCategory.findFirst({
      where: { id, businessId },
    })

    if (!category) {
      return res.status(404).json({ message: 'Expense category not found' })
    }

    const { name, categoryType, isActive } = req.body as UpdateExpenseCategoryInput

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(categoryType ? { categoryType } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    return res.status(200).json({
      message: 'Expense category updated',
      data: updated,
    })
  }
)

// ----------------------------------------------------
// Expenses
// ----------------------------------------------------

expensesRouter.get(
  '/',
  validateQuery(getExpensesQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { branchId, categoryId, startDate, endDate, paymentMethod, status } = req.query as any

    const where: any = { businessId }
    if (branchId) where.branchId = branchId
    if (categoryId) where.categoryId = categoryId
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (status) where.status = status

    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) where.expenseDate.gte = new Date(startDate)
      if (endDate) where.expenseDate.lte = new Date(endDate)
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    })

    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))]
    const branchIds = [...new Set(expenses.map((e) => e.branchId))]

    const [categories, branches] = await Promise.all([
      prisma.expenseCategory.findMany({ where: { id: { in: categoryIds } } }),
      prisma.branch.findMany({ where: { id: { in: branchIds } } }),
    ])

    const catMap = new Map(categories.map((c) => [c.id, c]))
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    const result = expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      categoryName: catMap.get(e.categoryId)?.name || 'General',
      categoryType: catMap.get(e.categoryId)?.categoryType || 'OPERATING',
      branchName: branchMap.get(e.branchId) || '',
    }))

    return res.status(200).json({ data: result })
  }
)

expensesRouter.post(
  '/',
  validateBody(createExpenseSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const userId = req.auth?.userId
    if (!businessId || !userId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { branchId, categoryId, amount, expenseDate, paymentMethod, description, referenceNumber } =
      req.body as CreateExpenseInput

    const [branch, category] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branchId, businessId } }),
      prisma.expenseCategory.findFirst({ where: { id: categoryId, businessId } }),
    ])

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found in business' })
    }
    if (!category) {
      return res.status(404).json({ message: 'Expense category not found in business' })
    }
    if (!category.isActive) {
      return res.status(400).json({ message: 'Expense category is inactive' })
    }

    const expense = await prisma.expense.create({
      data: {
        businessId,
        branchId,
        categoryId,
        amount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod,
        description: description ?? null,
        referenceNumber: referenceNumber ?? null,
        createdById: userId,
        status: 'RECORDED',
      },
    })

    return res.status(201).json({
      message: 'Expense recorded successfully',
      data: {
        ...expense,
        amount: Number(expense.amount),
        categoryName: category.name,
        categoryType: category.categoryType,
        branchName: branch.name,
      },
    })
  }
)

expensesRouter.get('/:id', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  const id = String(req.params.id)

  if (!businessId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const expense = await prisma.expense.findFirst({
    where: { id, businessId },
  })

  if (!expense) {
    return res.status(404).json({ message: 'Expense record not found' })
  }

  const [category, branch] = await Promise.all([
    prisma.expenseCategory.findFirst({ where: { id: expense.categoryId } }),
    prisma.branch.findFirst({ where: { id: expense.branchId } }),
  ])

  return res.status(200).json({
    data: {
      ...expense,
      amount: Number(expense.amount),
      categoryName: category?.name || 'General',
      categoryType: category?.categoryType || 'OPERATING',
      branchName: branch?.name || '',
    },
  })
})

expensesRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  const id = String(req.params.id)

  if (!businessId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const expense = await prisma.expense.findFirst({
    where: { id, businessId },
  })

  if (!expense) {
    return res.status(404).json({ message: 'Expense record not found' })
  }
  if (expense.status === 'CANCELLED') {
    return res.status(400).json({ message: 'Expense is already cancelled' })
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return res.status(200).json({
    message: 'Expense cancelled successfully',
    data: {
      ...updated,
      amount: Number(updated.amount),
    },
  })
})
