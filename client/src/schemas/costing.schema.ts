import { z } from 'zod'

export const compensationTypeOptions = [
  { value: 'HOURLY', label: 'Hourly Wage (ETB / Hour)' },
  { value: 'MONTHLY_SALARY', label: 'Monthly Fixed Salary (ETB / Month)' },
  { value: 'PIECE_RATE', label: 'Piece-Rate (ETB / Accepted Injera)' },
] as const

export const overheadCategoryOptions = [
  { value: 'ELECTRICITY', label: 'Electricity (Power / Mitad heating)' },
  { value: 'WATER', label: 'Water (Baking & Cleaning)' },
  { value: 'FIREWOOD', label: 'Firewood / Biomass' },
  { value: 'FUEL', label: 'Fuel / Generator' },
  { value: 'PACKAGING', label: 'Packaging / Bags / Ties' },
  { value: 'LABOUR', label: 'Labour / Helper Stipend' },
  { value: 'OTHER', label: 'Other Operating Expense' },
] as const

export const overheadAllocationTypeOptions = [
  { value: 'DIRECT_BATCH', label: 'Direct Batch Overhead (Assigned to 1 batch)' },
  { value: 'DAILY_SHARED', label: 'Daily Shared Overhead (Allocated across batches)' },
] as const

export const paymentMethodOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHECK', label: 'Check' },
  { value: 'TELEBIRR', label: 'Telebirr' },
  { value: 'OTHER', label: 'Other' },
] as const

// 1. Employee Compensation Setup Schema
export const createCompensationSchema = z.object({
  employeeId: z.string().uuid('Please select an employee'),
  compensationType: z.enum(['HOURLY', 'MONTHLY_SALARY', 'PIECE_RATE']),
  baseRate: z.number().min(0, 'Base rate must be non-negative'),
  pieceRatePerInjera: z.number().min(0, 'Piece rate must be non-negative').optional().nullable(),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  notes: z.string().trim().max(500).optional().nullable(),
})

export type CreateCompensationInput = z.infer<typeof createCompensationSchema>

// 2. Direct & Shared Overhead Expense Schema
export const createOverheadRecordSchema = z.object({
  branchId: z.string().uuid('Please select a branch'),
  productionBatchId: z.string().uuid('Invalid batch ID').optional().nullable(),
  operationalDate: z.string().min(1, 'Operational date is required'),
  category: z.enum(['ELECTRICITY', 'WATER', 'FIREWOOD', 'FUEL', 'PACKAGING', 'LABOUR', 'OTHER']),
  amount: z.number().positive('Amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'TELEBIRR', 'OTHER']).optional().nullable(),
  allocationType: z.enum(['DIRECT_BATCH', 'DAILY_SHARED']),
  description: z.string().trim().max(500).optional().nullable(),
  sourceReference: z.string().trim().max(100).optional().nullable(),
}).refine(
  (data) => {
    if (data.allocationType === 'DIRECT_BATCH' && !data.productionBatchId) {
      return false
    }
    return true
  },
  {
    message: 'Production Batch is required for Direct Batch overhead',
    path: ['productionBatchId'],
  }
)

export type CreateOverheadRecordInput = z.infer<typeof createOverheadRecordSchema>

// 3. Overhead Allocation Schema
export const allocateOverheadItemSchema = z.object({
  productionBatchId: z.string().uuid('Please select a batch'),
  allocatedAmount: z.number().positive('Allocated amount must be greater than 0'),
  allocationBasis: z.string().trim().min(1),
})

export const allocateOverheadSchema = z.object({
  allocations: z.array(allocateOverheadItemSchema).min(1, 'At least one batch allocation is required'),
})

export type AllocateOverheadInput = z.infer<typeof allocateOverheadSchema>

// 4. Labour Cost Daily Record Schema
export const createLabourCostRecordSchema = z.object({
  branchId: z.string().uuid('Please select a branch'),
  employeeId: z.string().uuid('Please select an employee'),
  attendanceRecordId: z.string().uuid().optional().nullable(),
  operationalDate: z.string().min(1, 'Operational date is required'),
  workedMinutes: z.number().int().min(0, 'Worked minutes must be non-negative'),
  compensationTypeSnapshot: z.enum(['HOURLY', 'MONTHLY_SALARY', 'PIECE_RATE']),
  rateSnapshot: z.number().min(0, 'Rate snapshot must be non-negative'),
  totalLabourCost: z.number().min(0, 'Total labour cost must be non-negative'),
})

export type CreateLabourCostRecordInput = z.infer<typeof createLabourCostRecordSchema>

// 5. Labour Cost Allocation Schema
export const allocateLabourItemSchema = z.object({
  productionBatchId: z.string().uuid('Please select a batch'),
  allocatedCost: z.number().positive('Allocated cost must be greater than 0'),
  allocationBasis: z.string().trim().min(1),
})

export const allocateLabourCostSchema = z.object({
  allocations: z.array(allocateLabourItemSchema).min(1, 'At least one batch allocation is required'),
})

export type AllocateLabourCostInput = z.infer<typeof allocateLabourCostSchema>
