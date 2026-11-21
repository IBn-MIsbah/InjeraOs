import { z } from 'zod'

// 1. Expense Categories
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

// 2. Expenses
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

// 3. Reporting Filters
export const reportFilterSchema = z.object({
  branchId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type ReportFilterInput = z.infer<typeof reportFilterSchema>

// 4. Dashboard Builder
export const dashboardWidgetSchema = z.object({
  widgetType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(150),
  positionX: z.number().int().nonnegative(),
  positionY: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  configuration: z.record(z.string(), z.any()).default({}),
})

export type DashboardWidgetInput = z.infer<typeof dashboardWidgetSchema>

export const createDashboardLayoutSchema = z.object({
  name: z.string().trim().min(1, 'Layout name is required').max(100),
  isDefault: z.boolean().default(false),
  widgets: z.array(dashboardWidgetSchema).default([]),
})

export type CreateDashboardLayoutInput = z.infer<typeof createDashboardLayoutSchema>

export const updateDashboardLayoutSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  widgets: z.array(dashboardWidgetSchema).optional(),
})

export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>
