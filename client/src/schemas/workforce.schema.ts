import { z } from 'zod'
import { optionalPhoneSchema, requiredString, uuidSchema } from './common.schema'

export const employmentTypeOptions = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
] as const

export const employeeStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'TERMINATED', label: 'Terminated' },
] as const

export const shiftTypeOptions = [
  { value: 'DAY', label: 'Day Shift' },
  { value: 'NIGHT', label: 'Night Shift (Overnight)' },
  { value: 'CUSTOM', label: 'Custom Shift' },
] as const

export const createDepartmentSchema = z.object({
  name: requiredString('Department name', 2, 100),
  description: z.string().trim().max(300).optional(),
})

export const createPositionSchema = z.object({
  name: requiredString('Job position title', 2, 100),
  departmentId: uuidSchema.optional().or(z.literal('')),
  description: z.string().trim().max(300).optional(),
})

export const createEmployeeSchema = z.object({
  firstName: requiredString('First name', 2, 100),
  lastName: requiredString('Last name', 2, 100),
  employeeNumber: z.string().trim().max(50).optional(),
  branchId: uuidSchema,
  positionId: uuidSchema,
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'CONTRACT']),
  hireDate: z.string().min(1, 'Hire date is required'),
  phone: optionalPhoneSchema,
  address: z.string().trim().max(300).optional(),
})

export const createShiftSchema = z.object({
  branchId: uuidSchema,
  name: requiredString('Shift name', 2, 100),
  shiftType: z.enum(['DAY', 'NIGHT', 'CUSTOM']),
  startTime: z.string().regex(/^\d{2}:\d{2}/, 'Format must be HH:mm (e.g. 06:00)'),
  endTime: z.string().regex(/^\d{2}:\d{2}/, 'Format must be HH:mm (e.g. 14:00)'),
  crossesMidnight: z.boolean(),
  breakMinutes: z.number().int().min(0).max(360),
})

export const createShiftAssignmentSchema = z.object({
  branchId: uuidSchema,
  employeeId: uuidSchema,
  shiftId: uuidSchema,
  scheduledStart: z.string().min(1, 'Start timestamp is required'),
  scheduledEnd: z.string().min(1, 'End timestamp is required'),
})

export const clockInSchema = z.object({
  branchId: uuidSchema,
  employeeId: uuidSchema,
  shiftAssignmentId: uuidSchema.optional().or(z.literal('')),
  operationalDate: z.string().min(1, 'Operational date is required'),
  notes: z.string().trim().max(300).optional(),
})

export const clockOutSchema = z.object({
  attendanceId: uuidSchema,
  breakMinutes: z.number().int().min(0).max(360),
  notes: z.string().trim().max(300).optional(),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type CreatePositionInput = z.infer<typeof createPositionSchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type CreateShiftAssignmentInput = z.infer<typeof createShiftAssignmentSchema>
export type ClockInInput = z.infer<typeof clockInSchema>
export type ClockOutInput = z.infer<typeof clockOutSchema>
