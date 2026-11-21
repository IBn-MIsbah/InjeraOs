import { z } from 'zod'
import {
  nonNegativeIntegerSchema,
  positiveIntegerSchema,
  uuidSchema,
} from './common.schema'
import { RejectionReason } from '../types/enums'

export const createProductionBatchSchema = z.object({
  branchId: uuidSchema,
  recipeId: uuidSchema,
  plannedQuantity: positiveIntegerSchema,
  scheduledDate: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(500).optional(),
})

export const recordProductionOutputSchema = z.object({
  batchId: uuidSchema,
  productId: uuidSchema,
  goodQuantity: nonNegativeIntegerSchema,
  rejectedQuantity: nonNegativeIntegerSchema.default(0),
  notes: z.string().trim().max(500).optional(),
})

export const recordRejectionSchema = z.object({
  batchId: uuidSchema,
  quantity: positiveIntegerSchema,
  reason: z.enum([
    RejectionReason.BURNT,
    RejectionReason.TORN_DAMAGED,
    RejectionReason.INCORRECT_THICKNESS,
    RejectionReason.INCORRECT_SIZE,
    RejectionReason.CONTAMINATION,
    RejectionReason.OTHER,
  ]),
  notes: z.string().trim().max(500).optional(),
})

export const recordBakerProductionSchema = z.object({
  batchId: uuidSchema,
  employeeId: uuidSchema,
  quantity: positiveIntegerSchema,
  shiftId: uuidSchema.optional(),
  notes: z.string().trim().max(500).optional(),
})

export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>
export type RecordProductionOutputInput = z.infer<typeof recordProductionOutputSchema>
export type RecordRejectionInput = z.infer<typeof recordRejectionSchema>
export type RecordBakerProductionInput = z.infer<typeof recordBakerProductionSchema>
