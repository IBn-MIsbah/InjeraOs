import { z } from 'zod'
import {
  emailSchema,
  nonNegativeAmountSchema,
  nonNegativeIntegerSchema,
  optionalPhoneSchema,
  requiredString,
  uuidSchema,
} from './common.schema'
import { CustomerType, LedgerTransactionType } from '../types/enums'

export const createCustomerSchema = z.object({
  name: requiredString('Customer name', 2, 150),
  customerType: z
    .enum([
      CustomerType.INDIVIDUAL,
      CustomerType.GROCERY_SHOP,
      CustomerType.RESTAURANT,
      CustomerType.HOTEL,
      CustomerType.WHOLESALER,
      CustomerType.OTHER,
    ])
    .default(CustomerType.INDIVIDUAL),
  phone: optionalPhoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  creditLimit: nonNegativeAmountSchema.default(0),
  paymentTermsDays: nonNegativeIntegerSchema.default(0),
  tinNumber: z.string().trim().max(50).optional(),
  isActive: z.boolean().default(true),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const customerLedgerFilterSchema = z.object({
  customerId: uuidSchema,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  transactionType: z
    .enum([
      LedgerTransactionType.SALE,
      LedgerTransactionType.PAYMENT,
      LedgerTransactionType.ADJUSTMENT,
      LedgerTransactionType.REVERSAL,
    ])
    .optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerLedgerFilterInput = z.infer<typeof customerLedgerFilterSchema>
