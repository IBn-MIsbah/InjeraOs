import { z } from 'zod'

export const roleIdParamsSchema = z.object({
  roleId: z.string().uuid(),
})

export const membershipIdParamsSchema = z.object({
  membershipId: z.string().uuid(),
})

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional(),
  permissionCodes: z.array(z.string().trim()).default([]),
})

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(300).optional(),
})

export const setRolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string().trim()),
})

export const assignMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>
export type AssignMemberRoleInput = z.infer<typeof assignMemberRoleSchema>
