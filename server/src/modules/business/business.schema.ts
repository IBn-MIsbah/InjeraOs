import { z } from 'zod'

export const updateBusinessSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  legalName: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().toLowerCase().max(255).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  currency: z.string().trim().max(3).default('ETB').optional(),
  timezone: z.string().trim().max(100).optional(),
  dateCalendar: z.enum(['GREGORIAN', 'ETHIOPIAN']).optional(),
})

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(1).max(50),
  address: z.string().trim().max(300).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  isMain: z.boolean().default(false),
})

export const updateBranchSchema = createBranchSchema.partial()

export const branchIdParamsSchema = z.object({
  branchId: z.string().uuid(),
})

export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().max(255),
  roleId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()).default([]),
})

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>
export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
