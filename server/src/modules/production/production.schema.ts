import { z } from 'zod'

// Enum definitions matching Prisma schema
export const ProductionStatusEnum = z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
export const BatchAssignmentRoleEnum = z.enum(['BAKER', 'LABOURER', 'SUPERVISOR', 'OTHER'])
export const RejectionReasonEnum = z.enum([
  'BURNT',
  'TORN_DAMAGED',
  'INCORRECT_THICKNESS',
  'INCORRECT_SIZE',
  'CONTAMINATION',
  'OTHER',
])
export const AttributionMethodEnum = z.enum(['INDIVIDUAL_COUNT', 'SUPERVISOR_ALLOCATION'])
export const AllocationMethodEnum = z.enum([
  'PRODUCTION_QUANTITY',
  'PRODUCTION_TIME',
  'DIRECT_MATERIAL_COST',
  'MANUAL_PERCENTAGE',
])

// Production Session Schemas
export const createProductionSessionSchema = z.object({
  branchId: z.string().uuid('Valid branchId is required'),
  sessionNumber: z.string().trim().min(1, 'Session number is required').max(50),
  operationalDate: z.string().or(z.date()),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()).optional().nullable(),
  shiftAssignmentId: z.string().uuid().optional().nullable(),
  supervisorId: z.string().uuid('Valid supervisorId is required'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type CreateProductionSessionInput = z.infer<typeof createProductionSessionSchema>

export const updateSessionStatusSchema = z.object({
  status: ProductionStatusEnum,
  endTime: z.string().or(z.date()).optional().nullable(),
})

export type UpdateSessionStatusInput = z.infer<typeof updateSessionStatusSchema>

// Production Batch Schemas
export const createProductionBatchSchema = z.object({
  productionSessionId: z.string().uuid('Valid productionSessionId is required'),
  recipeId: z.string().uuid('Valid recipeId is required'),
  recipeVersionId: z.string().uuid('Valid recipeVersionId is required'),
  batchNumber: z.string().trim().min(1, 'Batch number is required').max(50),
  plannedQuantity: z.number().positive('Planned quantity must be greater than zero'),
  startTime: z.string().or(z.date()).optional().nullable(),
})

export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>

// Batch Employee Assignment Schema
export const createBatchAssignmentSchema = z.object({
  employeeId: z.string().uuid('Valid employeeId is required'),
  assignmentRole: BatchAssignmentRoleEnum,
  assignedStart: z.string().or(z.date()),
  assignedEnd: z.string().or(z.date()).optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type CreateBatchAssignmentInput = z.infer<typeof createBatchAssignmentSchema>

// Material Consumption Item Schema
export const materialConsumptionItemSchema = z.object({
  materialLotId: z.string().uuid('Valid materialLotId is required'),
  actualQuantity: z.number().positive('Actual quantity consumed must be greater than zero'),
  unitId: z.string().uuid('Valid unitId is required'),
})

export const recordMaterialConsumptionSchema = z.object({
  consumptions: z.array(materialConsumptionItemSchema).min(1, 'At least one lot consumption is required'),
})

export type RecordMaterialConsumptionInput = z.infer<typeof recordMaterialConsumptionSchema>

// Rejection Record Detail Schema
export const detailedRejectionItemSchema = z.object({
  reason: RejectionReasonEnum,
  quantity: z.number().int().positive('Rejection quantity must be a positive integer'),
  employeeId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
  evidenceReference: z.string().trim().max(150).optional().nullable(),
})

export type DetailedRejectionItem = z.infer<typeof detailedRejectionItemSchema>

// Production Output Record Schema
export const recordProductionOutputSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  acceptedQuantity: z.number().int().min(0, 'Accepted quantity cannot be negative'),
  rejectedQuantity: z.number().int().min(0, 'Rejected quantity cannot be negative'),
  allocationMethod: AllocationMethodEnum.default('PRODUCTION_QUANTITY'),
  rejections: z.array(detailedRejectionItemSchema).optional(),
})

export type RecordProductionOutputInput = z.infer<typeof recordProductionOutputSchema>

// Baker Production Attribution Schema
export const recordBakerProductionSchema = z.object({
  employeeId: z.string().uuid('Valid employeeId is required'),
  productId: z.string().uuid('Valid productId is required'),
  shiftAssignmentId: z.string().uuid().optional().nullable(),
  acceptedQuantity: z.number().int().min(0, 'Accepted quantity cannot be negative'),
  rejectedQuantity: z.number().int().min(0, 'Rejected quantity cannot be negative'),
  attributionMethod: AttributionMethodEnum.default('INDIVIDUAL_COUNT'),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type RecordBakerProductionInput = z.infer<typeof recordBakerProductionSchema>
