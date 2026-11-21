import { z } from 'zod'
import {
  emailSchema,
  optionalPhoneSchema,
  requiredString,
  uuidSchema,
} from './common.schema'
import { Calendar } from '../types/enums'

export const createBusinessSchema = z.object({
  name: requiredString('Business name', 2, 150),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(50).optional(),
  calendarPreference: z
    .enum([Calendar.GREGORIAN, Calendar.ETHIOPIAN])
    .default(Calendar.ETHIOPIAN),
  currency: z.string().trim().max(10).default('ETB'),
  phone: optionalPhoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
})

export const updateBusinessSchema = createBusinessSchema.partial()

export const createBranchSchema = z.object({
  name: requiredString('Branch name', 2, 150),
  code: z.string().trim().min(1, 'Branch code is required').max(50),
  phone: optionalPhoneSchema,
  address: z.string().trim().max(300).optional(),
  isMain: z.boolean(),
})

export const updateBranchSchema = createBranchSchema.partial()

export const inviteMemberSchema = z.object({
  email: emailSchema,
  roleId: uuidSchema.optional(),
  role: z.string().trim().min(2).max(50).optional(),
  branchIds: z.array(uuidSchema).default([]),
}).refine((data) => data.roleId !== undefined || data.role !== undefined, {
  message: 'Please select or specify a role for the new member',
  path: ['roleId'],
})

export const assignMemberRoleSchema = z.object({
  roleId: uuidSchema,
})

export const createCustomRoleSchema = z.object({
  name: requiredString('Role name', 2, 100),
  description: z.string().trim().max(300).optional(),
  permissionCodes: z.array(z.string().trim()).default([]),
})

export const setRolePermissionsSchema = z.object({
  permissionCodes: z
    .array(z.string().trim())
    .min(1, { message: 'Select at least one permission' }),
})

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type AssignMemberRoleInput = z.infer<typeof assignMemberRoleSchema>
export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>
