import { z } from 'zod'

export const dimensionOptions = [
  { value: 'MASS', label: 'Mass / Weight (e.g. kg, g)' },
  { value: 'VOLUME', label: 'Volume (e.g. L, ml)' },
  { value: 'COUNT', label: 'Count (e.g. pcs, bags)' },
  { value: 'OTHER', label: 'Other Dimension' },
] as const

export const paymentStatusOptions = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'PAID', label: 'Fully Paid' },
] as const

export const lotAdjustmentTypeOptions = [
  { value: 'PRODUCTION_CONSUMPTION', label: 'Production Consumption (Deduct)' },
  { value: 'ADJUSTMENT_OUT', label: 'Manual Adjustment Out (Deduct / Spoilage)' },
  { value: 'ADJUSTMENT_IN', label: 'Manual Adjustment In (Add Stock)' },
] as const

// Category Schema
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// Unit of Measure Schema
export const createUnitSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(50),
  symbol: z.string().trim().min(1, 'Unit symbol is required').max(20),
  dimension: z.enum(['MASS', 'VOLUME', 'COUNT', 'OTHER']),
  isBaseUnit: z.boolean(),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>

// Material Schema
export const createMaterialSchema = z.object({
  name: z.string().trim().min(1, 'Material name is required').max(150),
  categoryId: z.string().uuid('Please select a category'),
  defaultUnitId: z.string().uuid('Please select a default unit'),
  minimumStock: z.number().min(0, 'Minimum stock cannot be negative'),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

// Variety Schema
export const createVarietySchema = z.object({
  name: z.string().trim().min(1, 'Variety name is required').max(100),
  description: z.string().trim().max(500).optional(),
})

export type CreateVarietyInput = z.infer<typeof createVarietySchema>

// Supplier Schema
export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(150),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  contactPerson: z.string().trim().max(150).optional(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

// Purchase Item Form Schema
export const createPurchaseItemSchema = z.object({
  materialId: z.string().uuid('Select a material'),
  varietyId: z.string().uuid().optional().nullable().or(z.literal('')),
  unitId: z.string().uuid('Select a unit of measure'),
  grossQuantity: z.number().positive('Gross quantity must be greater than 0'),
  tareQuantity: z.number().min(0, 'Tare quantity cannot be negative').default(0),
  unusableQuantity: z.number().min(0, 'Unusable quantity cannot be negative').default(0),
  purchaseCost: z.number().min(0, 'Purchase cost cannot be negative'),
})

export type CreatePurchaseItemInput = z.infer<typeof createPurchaseItemSchema>

// Purchase Form Schema
export const createPurchaseSchema = z.object({
  branchId: z.string().uuid('Select destination branch'),
  supplierId: z.string().uuid('Select a supplier'),
  purchaseNumber: z.string().trim().min(1, 'Purchase invoice / PO number is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  acquisitionCost: z.number().min(0, 'Transport / acquisition cost cannot be negative'),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']),
  receiveImmediately: z.boolean(),
  // Direct purchase form fields for single-item ease:
  materialId: z.string().uuid('Select a material'),
  varietyId: z.string().optional().nullable(),
  unitId: z.string().uuid('Select a unit of measure'),
  grossQuantity: z.number().positive('Gross quantity must be greater than 0'),
  tareQuantity: z.number().min(0),
  unusableQuantity: z.number().min(0),
  purchaseCost: z.number().min(0),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>

// Lot Adjustment Form Schema
export const adjustLotSchema = z.object({
  movementType: z.enum(['PRODUCTION_CONSUMPTION', 'ADJUSTMENT_OUT', 'ADJUSTMENT_IN']),
  quantity: z.number().positive('Adjustment quantity must be greater than 0'),
  reason: z.string().trim().min(1, 'Reason or reference note is required'),
})

export type AdjustLotInput = z.infer<typeof adjustLotSchema>
