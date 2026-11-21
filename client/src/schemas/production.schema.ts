import { z } from 'zod'

export const productionStatusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export const batchRoleOptions = [
  { value: 'BAKER', label: 'Baker (Mitad Operator)' },
  { value: 'LABOURER', label: 'Labourer / Helper' },
  { value: 'SUPERVISOR', label: 'Shift Supervisor' },
  { value: 'OTHER', label: 'Support / Other' },
] as const

export const rejectionReasonOptions = [
  { value: 'BURNT', label: 'Burnt (Overbaked)' },
  { value: 'TORN_DAMAGED', label: 'Torn / Damaged on Peeling' },
  { value: 'INCORRECT_THICKNESS', label: 'Incorrect Thickness' },
  { value: 'INCORRECT_SIZE', label: 'Incorrect Size / Edge Defects' },
  { value: 'CONTAMINATION', label: 'Contamination' },
  { value: 'OTHER', label: 'Other Quality Defect' },
] as const

export const attributionMethodOptions = [
  { value: 'INDIVIDUAL_COUNT', label: 'Individual Mitad Counter Reading' },
  { value: 'SUPERVISOR_ALLOCATION', label: 'Supervisor Allocated' },
] as const

// Session Schema
export const createProductionSessionSchema = z.object({
  branchId: z.string().uuid('Please select a branch'),
  sessionNumber: z.string().trim().min(1, 'Session number is required').max(50),
  operationalDate: z.string().min(1, 'Operational date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional().nullable(),
  shiftAssignmentId: z.string().optional().nullable(),
  supervisorId: z.string().uuid('Please select a supervisor'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type CreateProductionSessionInput = z.infer<typeof createProductionSessionSchema>

// Batch Schema
export const createProductionBatchSchema = z.object({
  productionSessionId: z.string().uuid('Please select a session'),
  recipeId: z.string().uuid('Please select a recipe'),
  recipeVersionId: z.string().uuid('Please select a recipe version'),
  batchNumber: z.string().trim().min(1, 'Batch number is required').max(50),
  plannedQuantity: z.number().positive('Planned quantity must be greater than zero'),
  startTime: z.string().optional().nullable(),
})

export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>

// Batch Assignment Schema
export const createBatchAssignmentSchema = z.object({
  employeeId: z.string().uuid('Please select an employee'),
  assignmentRole: z.enum(['BAKER', 'LABOURER', 'SUPERVISOR', 'OTHER']),
  assignedStart: z.string().min(1, 'Start time is required'),
  assignedEnd: z.string().optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type CreateBatchAssignmentInput = z.infer<typeof createBatchAssignmentSchema>

// Material Consumption Schema
export const materialConsumptionItemSchema = z.object({
  materialLotId: z.string().uuid('Please select a material lot'),
  actualQuantity: z.number().positive('Quantity must be greater than zero'),
  unitId: z.string().uuid('Please select a unit'),
})

export const recordMaterialConsumptionSchema = z.object({
  consumptions: z.array(materialConsumptionItemSchema).min(1, 'At least one lot consumption is required'),
})

export type RecordMaterialConsumptionInput = z.infer<typeof recordMaterialConsumptionSchema>

// Detailed Rejection Item
export const detailedRejectionItemSchema = z.object({
  reason: z.enum(['BURNT', 'TORN_DAMAGED', 'INCORRECT_THICKNESS', 'INCORRECT_SIZE', 'CONTAMINATION', 'OTHER']),
  quantity: z.number().int().positive('Quantity must be positive'),
  employeeId: z.string().optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type DetailedRejectionItem = z.infer<typeof detailedRejectionItemSchema>

// Production Output Schema
export const recordProductionOutputSchema = z.object({
  productId: z.string().uuid('Please select a product'),
  acceptedQuantity: z.number().int().min(0, 'Accepted quantity cannot be negative'),
  rejectedQuantity: z.number().int().min(0, 'Rejected quantity cannot be negative'),
  allocationMethod: z.enum(['PRODUCTION_QUANTITY', 'PRODUCTION_TIME', 'DIRECT_MATERIAL_COST', 'MANUAL_PERCENTAGE']),
  rejections: z.array(detailedRejectionItemSchema).optional(),
})

export type RecordProductionOutputInput = z.infer<typeof recordProductionOutputSchema>

// Baker Attribution Schema
export const recordBakerProductionSchema = z.object({
  employeeId: z.string().uuid('Please select a baker'),
  productId: z.string().uuid('Please select a product'),
  acceptedQuantity: z.number().int().min(0, 'Accepted quantity cannot be negative'),
  rejectedQuantity: z.number().int().min(0, 'Rejected quantity cannot be negative'),
  attributionMethod: z.enum(['INDIVIDUAL_COUNT', 'SUPERVISOR_ALLOCATION']),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type RecordBakerProductionInput = z.infer<typeof recordBakerProductionSchema>
