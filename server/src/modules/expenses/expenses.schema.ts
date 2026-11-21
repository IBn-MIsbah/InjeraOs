import { z } from 'zod'

export const expenseCategoryTypeEnum = z.enum([
  'OPERATING',
  'ADMINISTRATIVE',
  'MARKETING',
  'TRANSPORT',
  'MAINTENANCE',
  'OTHER',
])

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  categoryType: expenseCategoryTypeEnum.default('OPERATING'),
  isActive: z.boolean().default(true),
})

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>

export const updateExpenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  categoryType: expenseCategoryTypeEnum.optional(),
  isActive: z.boolean().optional(),
})

export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>

export const createExpenseSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  categoryId: z.string().uuid('Valid expense category ID required'),
  amount: z.number().positive('Expense amount must be greater than zero'),
  expenseDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']).default('CASH'),
  description: z.string().trim().max(500).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

export const getExpensesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']).optional(),
  status: z.enum(['DRAFT', 'RECORDED', 'CANCELLED']).optional(),
})

export type GetExpensesQueryInput = z.infer<typeof getExpensesQuerySchema>
