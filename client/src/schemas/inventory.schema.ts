import { z } from 'zod'

// 1. Stock Location Schemas
export const createStockLocationSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  name: z.string().trim().min(1, 'Location name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
})

export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>

export const updateStockLocationSchema = z.object({
  name: z.string().trim().min(1, 'Location name cannot be empty').max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
})

export type UpdateStockLocationInput = z.infer<typeof updateStockLocationSchema>

// 2. Production to Finished Stock Posting Schema
export const postProductionToStockSchema = z.object({
  productionBatchId: z.string().uuid('Valid production batch ID required'),
  productionOutputId: z.string().uuid('Valid output ID required').optional().nullable(),
  stockLocationId: z.string().uuid('Valid stock location ID required'),
  expiryHours: z.number().int().min(1).max(720).optional().default(72),
  customExpiryAt: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type PostProductionToStockInput = z.infer<typeof postProductionToStockSchema>

// 3. Finished Goods Adjustment & Damage Schema
export const recordFinishedAdjustmentSchema = z.object({
  finishedInventoryLotId: z.string().uuid('Valid finished lot ID required'),
  movementType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE_OUT', 'SPOILAGE_OUT']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type RecordFinishedAdjustmentInput = z.infer<typeof recordFinishedAdjustmentSchema>

// 4. Finished Stock Transfer Schema
export const transferFinishedStockSchema = z.object({
  sourceLotId: z.string().uuid('Valid source lot ID required'),
  targetStockLocationId: z.string().uuid('Valid destination stock location ID required'),
  quantity: z.number().int().positive('Transfer quantity must be greater than zero'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type TransferFinishedStockInput = z.infer<typeof transferFinishedStockSchema>

// 5. Raw Material Stock Adjustment Schema
export const recordRawAdjustmentSchema = z.object({
  materialLotId: z.string().uuid('Valid material lot ID required'),
  movementType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type RecordRawAdjustmentInput = z.infer<typeof recordRawAdjustmentSchema>
