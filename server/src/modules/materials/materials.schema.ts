import { z } from 'zod'

export const dimensionEnum = z.enum(['MASS', 'VOLUME', 'COUNT', 'OTHER'])
export const paymentStatusEnum = z.enum(['UNPAID', 'PARTIAL', 'PAID'])
export const documentStatusEnum = z.enum(['DRAFT', 'RECEIVED', 'COMPLETED', 'CANCELLED'])
export const lotStatusEnum = z.enum(['AVAILABLE', 'DEPLETED', 'BLOCKED', 'EXPIRED'])
export const materialMovementTypeEnum = z.enum([
  'PURCHASE_RECEIPT',
  'PRODUCTION_CONSUMPTION',
  'BLEND_INPUT',
  'BLEND_OUTPUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'REVERSAL',
])

// Category Schema
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// Unit of Measure Schema
export const createUnitSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(50),
  symbol: z.string().trim().min(1, 'Unit symbol is required').max(20),
  dimension: dimensionEnum,
  isBaseUnit: z.boolean().default(false),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>

// Unit Conversion Schema
export const convertUnitSchema = z.object({
  fromUnitId: z.string().uuid('Valid fromUnitId is required'),
  toUnitId: z.string().uuid('Valid toUnitId is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
})

export type ConvertUnitInput = z.infer<typeof convertUnitSchema>

// Material Schema
export const createMaterialSchema = z.object({
  name: z.string().trim().min(1, 'Material name is required').max(150),
  categoryId: z.string().uuid('Valid categoryId is required'),
  defaultUnitId: z.string().uuid('Valid defaultUnitId is required'),
  minimumStock: z.number().nonnegative('Minimum stock cannot be negative').default(0),
  isActive: z.boolean().default(true),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

export const updateMaterialSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  categoryId: z.string().uuid().optional(),
  defaultUnitId: z.string().uuid().optional(),
  minimumStock: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>

// Material Variety Schema
export const createVarietySchema = z.object({
  name: z.string().trim().min(1, 'Variety name is required').max(100),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
})

export type CreateVarietyInput = z.infer<typeof createVarietySchema>

// Supplier Schema
export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(150),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  contactPerson: z.string().trim().max(150).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

// Purchase Item Schema
export const createPurchaseItemSchema = z.object({
  materialId: z.string().uuid('Valid materialId is required'),
  varietyId: z.string().uuid('Valid varietyId is required').optional().nullable(),
  unitId: z.string().uuid('Valid unitId is required'),
  grossQuantity: z.number().positive('Gross quantity must be greater than zero'),
  tareQuantity: z.number().nonnegative('Tare quantity cannot be negative').default(0),
  unusableQuantity: z.number().nonnegative('Unusable quantity cannot be negative').default(0),
  purchaseCost: z.number().nonnegative('Purchase cost cannot be negative'),
  allocatedAcquisitionCost: z.number().nonnegative('Allocated acquisition cost cannot be negative').default(0),
})

export type CreatePurchaseItemInput = z.infer<typeof createPurchaseItemSchema>

// Purchase Schema
export const createPurchaseSchema = z.object({
  branchId: z.string().uuid('Valid branchId is required'),
  supplierId: z.string().uuid('Valid supplierId is required'),
  purchaseNumber: z.string().trim().min(1, 'Purchase number is required').max(50),
  purchaseDate: z.string().or(z.date()),
  acquisitionCost: z.number().nonnegative('Acquisition cost cannot be negative').default(0),
  paymentStatus: paymentStatusEnum.default('UNPAID'),
  receiveImmediately: z.boolean().default(false),
  items: z.array(createPurchaseItemSchema).min(1, 'At least one purchase item is required'),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>

// Lot Adjustment Schema
export const adjustLotSchema = z.object({
  movementType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'PRODUCTION_CONSUMPTION']),
  quantity: z.number().positive('Quantity must be greater than zero'),
  reason: z.string().trim().min(1, 'Reason or reference is required').max(255),
  referenceType: z.string().trim().max(50).default('MANUAL_ADJUSTMENT'),
})

export type AdjustLotInput = z.infer<typeof adjustLotSchema>
