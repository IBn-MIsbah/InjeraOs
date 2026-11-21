import { z } from 'zod'

// 1. Customer Schemas
export const customerTypeEnum = z.enum([
  'INDIVIDUAL',
  'GROCERY_SHOP',
  'RESTAURANT',
  'HOTEL',
  'WHOLESALER',
  'OTHER',
])

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required').max(150),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  customerType: customerTypeEnum.default('INDIVIDUAL'),
  creditLimit: z.number().nonnegative('Credit limit cannot be negative').optional().nullable(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name cannot be empty').max(150).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  customerType: customerTypeEnum.optional(),
  creditLimit: z.number().nonnegative().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

// 2. Sales Order Item Schema
export const saleItemInputSchema = z.object({
  productId: z.string().uuid('Valid product ID required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discount: z.number().nonnegative('Item discount cannot be negative').optional().default(0),
  specificLotAllocations: z
    .array(
      z.object({
        finishedInventoryLotId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
})

export type SaleItemInput = z.infer<typeof saleItemInputSchema>

// 3. Sales Creation Schema
export const createSaleSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  customerId: z.string().uuid().optional().nullable(),
  saleNumber: z.string().trim().min(1, 'Sale number is required').max(50),
  saleDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
  discount: z.number().nonnegative('Order discount cannot be negative').optional().default(0),
  items: z.array(saleItemInputSchema).min(1, 'At least one sale item is required'),
  payment: z
    .object({
      amount: z.number().positive('Payment amount must be greater than zero'),
      paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']),
      referenceNumber: z.string().trim().max(100).optional().nullable(),
    })
    .optional()
    .nullable(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>

// 4. Payment Recording Schema
export const recordPaymentSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  saleId: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER']),
  paymentDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

// 5. Customer Ledger Adjustment Schema
export const recordLedgerAdjustmentSchema = z.object({
  direction: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive('Adjustment amount must be positive'),
  transactionDate: z.string().datetime({ offset: true }).or(z.date()).optional(),
  description: z.string().trim().min(1, 'Reason/description for adjustment is required').max(255),
})

export type RecordLedgerAdjustmentInput = z.infer<typeof recordLedgerAdjustmentSchema>

// 6. Delivery Scheduling Schema
export const createDeliverySchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  customerId: z.string().uuid('Valid customer ID required'),
  saleId: z.string().uuid().optional().nullable(),
  deliveryEmployeeId: z.string().uuid('Valid delivery employee ID required'),
  deliveryDate: z.string().datetime({ offset: true }).or(z.date()),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Valid product ID required'),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    )
    .min(1, 'At least one delivery item required'),
})

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>

// 7. Update Delivery Status Schema
export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        deliveryItemId: z.string().uuid(),
        deliveredQuantity: z.number().int().nonnegative(),
      })
    )
    .optional(),
})

export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>

// 8. Query Filters
export const getSalesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).optional(),
  saleStatus: z.enum(['DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const getDeliveriesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  deliveryEmployeeId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  deliveryDate: z.string().optional(),
})
