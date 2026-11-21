import { z } from 'zod'
import {
  nonNegativeAmountSchema,
  optionalPhoneSchema,
  positiveAmountSchema,
  positiveIntegerSchema,
  requiredString,
  uuidSchema,
} from './common.schema'
import { PaymentMethod } from '../types/enums'

export const saleItemSchema = z.object({
  productId: uuidSchema,
  quantity: positiveIntegerSchema,
  unitPrice: positiveAmountSchema,
  discountAmount: nonNegativeAmountSchema.default(0),
})

export const createSaleSchema = z.object({
  branchId: uuidSchema,
  customerId: uuidSchema.optional(),
  saleDate: z.coerce.date().default(() => new Date()),
  items: z
    .array(saleItemSchema)
    .min(1, { message: 'Sale must contain at least one item' }),
  discountAmount: nonNegativeAmountSchema.default(0),
  paidAmount: nonNegativeAmountSchema.default(0),
  paymentMethod: z
    .enum([
      PaymentMethod.CASH,
      PaymentMethod.MOBILE_MONEY,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.OTHER,
    ])
    .default(PaymentMethod.CASH),
  paymentReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const recordPaymentSchema = z.object({
  branchId: uuidSchema,
  customerId: uuidSchema.optional(),
  saleId: uuidSchema.optional(),
  amount: positiveAmountSchema,
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMethod: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.MOBILE_MONEY,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.OTHER,
  ]),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const createDeliverySchema = z.object({
  saleId: uuidSchema,
  deliveryAddress: requiredString('Delivery destination address', 3, 300),
  recipientName: z.string().trim().max(150).optional(),
  recipientPhone: optionalPhoneSchema,
  driverName: z.string().trim().max(150).optional(),
  driverPhone: optionalPhoneSchema,
  scheduledDate: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(500).optional(),
})

export type SaleItemInput = z.infer<typeof saleItemSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>
