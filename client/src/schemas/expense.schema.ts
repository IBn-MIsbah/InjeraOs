import { z } from 'zod'
import {
  positiveAmountSchema,
  requiredString,
  uuidSchema,
} from './common.schema'
import { ExpenseCategoryType, ExpenseStatus, PaymentMethod } from '../types/enums'

export const expenseCategorySchema = z.object({
  name: requiredString('Category name', 2, 100),
  categoryType: z.enum([
    ExpenseCategoryType.OPERATING,
    ExpenseCategoryType.ADMINISTRATIVE,
    ExpenseCategoryType.MARKETING,
    ExpenseCategoryType.TRANSPORT,
    ExpenseCategoryType.MAINTENANCE,
    ExpenseCategoryType.OTHER,
  ]),
  isActive: z.boolean().default(true),
})

export const expenseSchema = z.object({
  branchId: uuidSchema,
  categoryId: uuidSchema,
  amount: positiveAmountSchema,
  expenseDate: z.coerce.date().default(() => new Date()),
  paymentMethod: z
    .enum([
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.MOBILE_MONEY,
      PaymentMethod.OTHER,
    ])
    .default(PaymentMethod.CASH),
  referenceNumber: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  status: z
    .enum([ExpenseStatus.DRAFT, ExpenseStatus.RECORDED, ExpenseStatus.CANCELLED])
    .default(ExpenseStatus.RECORDED),
})

export const updateExpenseSchema = expenseSchema.partial()

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
