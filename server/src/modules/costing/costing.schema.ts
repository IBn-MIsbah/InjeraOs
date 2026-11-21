import { z } from 'zod'

export const CompensationTypeEnum = z.enum(['HOURLY', 'DAILY', 'PER_SHIFT', 'MONTHLY'])
export const OverheadCategoryEnum = z.enum([
  'LABOUR',
  'FUEL',
  'FIREWOOD',
  'ELECTRICITY',
  'WATER',
  'PACKAGING',
  'OTHER',
])
export const OverheadAllocationTypeEnum = z.enum(['DIRECT_BATCH', 'DAILY_SHARED'])
export const AllocationMethodEnum = z.enum([
  'PRODUCTION_QUANTITY',
  'PRODUCTION_TIME',
  'DIRECT_MATERIAL_COST',
  'MANUAL_PERCENTAGE',
])
export const LabourCostStatusEnum = z.enum(['UNALLOCATED', 'ALLOCATED', 'FINALIZED'])

// Employee Compensation Schema
export const createEmployeeCompensationSchema = z.object({
  employeeId: z.string().uuid('Valid employeeId is required'),
  compensationType: CompensationTypeEnum,
  rate: z.number().positive('Compensation rate must be greater than zero'),
  effectiveFrom: z.string().or(z.date()),
  effectiveTo: z.string().or(z.date()).optional().nullable(),
})

export type CreateEmployeeCompensationInput = z.infer<typeof createEmployeeCompensationSchema>

// Overhead Record Schema
export const createOverheadRecordSchema = z.object({
  branchId: z.string().uuid('Valid branchId is required'),
  productionBatchId: z.string().uuid().optional().nullable(),
  operationalDate: z.string().or(z.date()),
  category: OverheadCategoryEnum,
  amount: z.number().positive('Overhead amount must be greater than zero'),
  paymentMethod: z.string().trim().max(50).optional().nullable(),
  allocationType: OverheadAllocationTypeEnum,
  description: z.string().trim().max(300).optional().nullable(),
  sourceReference: z.string().trim().max(150).optional().nullable(),
})

export type CreateOverheadRecordInput = z.infer<typeof createOverheadRecordSchema>

// Allocate Overhead to Batches Schema
export const overheadBatchAllocationItemSchema = z.object({
  productionBatchId: z.string().uuid('Valid productionBatchId is required'),
  allocationPercentage: z.number().min(0).max(100, 'Allocation percentage must be between 0 and 100'),
  allocatedAmount: z.number().positive('Allocated amount must be greater than zero'),
})

export const allocateOverheadSchema = z.object({
  allocationMethod: AllocationMethodEnum.default('PRODUCTION_QUANTITY'),
  allocations: z.array(overheadBatchAllocationItemSchema).min(1, 'At least one batch allocation is required'),
})

export type AllocateOverheadInput = z.infer<typeof allocateOverheadSchema>

// Labour Cost Record Schema
export const createLabourCostRecordSchema = z.object({
  branchId: z.string().uuid('Valid branchId is required'),
  employeeId: z.string().uuid('Valid employeeId is required'),
  attendanceRecordId: z.string().uuid().optional().nullable(),
  operationalDate: z.string().or(z.date()),
  workedMinutes: z.number().int().positive('Worked minutes must be greater than zero'),
  compensationTypeSnapshot: CompensationTypeEnum,
  rateSnapshot: z.number().positive('Rate snapshot must be greater than zero'),
  totalLabourCost: z.number().positive('Total labour cost must be greater than zero'),
})

export type CreateLabourCostRecordInput = z.infer<typeof createLabourCostRecordSchema>

// Allocate Labour to Batches Schema
export const labourBatchAllocationItemSchema = z.object({
  productionBatchId: z.string().uuid('Valid productionBatchId is required'),
  allocatedMinutes: z.number().int().positive('Allocated minutes must be greater than zero'),
  allocatedAmount: z.number().positive('Allocated amount must be greater than zero'),
})

export const allocateLabourCostSchema = z.object({
  allocationMethod: AllocationMethodEnum.default('PRODUCTION_QUANTITY'),
  allocations: z.array(labourBatchAllocationItemSchema).min(1, 'At least one batch allocation is required'),
})

export type AllocateLabourCostInput = z.infer<typeof allocateLabourCostSchema>
