import { z } from 'zod'

export const employmentTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'TEMPORARY',
  'CONTRACT',
])

export const employeeStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'TERMINATED',
])

export const shiftTypeEnum = z.enum([
  'DAY',
  'NIGHT',
  'CUSTOM',
])

export const assignmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CANCELLED',
])

export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'LATE',
  'HALF_DAY',
  'ABSENT',
  'LEAVE',
])

export const compensationTypeEnum = z.enum([
  'HOURLY',
  'DAILY',
  'PER_SHIFT',
  'MONTHLY',
])

// --- Department Schemas ---
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).nullable().optional(),
})

// --- Job Position Schemas ---
export const createPositionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  departmentId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(300).nullable().optional(),
})

// --- Employee Schemas ---
export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  employeeNumber: z.string().trim().min(1).max(50),
  branchId: z.string().uuid(),
  positionId: z.string().uuid(),
  employmentType: employmentTypeEnum.default('FULL_TIME'),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format (YYYY-MM-DD)'),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  status: employeeStatusEnum.default('ACTIVE').optional(),
  compensation: z
    .object({
      compensationType: compensationTypeEnum,
      rate: z.number().positive(),
      effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    })
    .optional(),
})

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  branchId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  employmentType: employmentTypeEnum.optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  status: employeeStatusEnum.optional(),
  terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional(),
})

export const employeeIdParamsSchema = z.object({
  employeeId: z.string().uuid(),
})

// --- Shift Schemas ---
export const createShiftSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  shiftType: shiftTypeEnum,
  startTime: z.string().regex(/^\d{2}:\d{2}/, 'Time must be in HH:mm format'),
  endTime: z.string().regex(/^\d{2}:\d{2}/, 'Time must be in HH:mm format'),
  crossesMidnight: z.boolean().default(false),
  breakMinutes: z.number().int().min(0).max(360).default(0),
})

// --- Shift Assignment Schemas ---
export const createShiftAssignmentSchema = z.object({
  branchId: z.string().uuid(),
  employeeId: z.string().uuid(),
  shiftId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  status: assignmentStatusEnum.default('SCHEDULED').optional(),
}).refine(
  (data) => new Date(data.scheduledEnd) > new Date(data.scheduledStart),
  { message: 'scheduledEnd must be after scheduledStart', path: ['scheduledEnd'] }
)

// --- Attendance Schemas ---
export const clockInSchema = z.object({
  branchId: z.string().uuid(),
  employeeId: z.string().uuid(),
  shiftAssignmentId: z.string().uuid().nullable().optional(),
  operationalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format: YYYY-MM-DD'),
  clockIn: z.string().datetime().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
})

export const clockOutSchema = z.object({
  attendanceId: z.string().uuid(),
  clockOut: z.string().datetime().optional(),
  breakMinutes: z.number().int().min(0).max(360).optional(),
  notes: z.string().trim().max(300).nullable().optional(),
})

export const createLeaveSchema = z.object({
  employeeId: z.string().uuid(),
  leaveType: z.string().trim().min(2).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  reason: z.string().trim().max(300).nullable().optional(),
  status: z.string().trim().max(30).default('APPROVED'),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type CreatePositionInput = z.infer<typeof createPositionSchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type CreateShiftAssignmentInput = z.infer<typeof createShiftAssignmentSchema>
export type ClockInInput = z.infer<typeof clockInSchema>
export type ClockOutInput = z.infer<typeof clockOutSchema>
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>
