import { z } from 'zod'

const phone = z.string().trim().min(7).max(30)

export const userIdParamsSchema = z.object({
  userId: z.uuid(),
})

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.email().trim().toLowerCase().max(255),
  phone: phone.optional(),
})

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  phone: phone.nullable().optional(),
}).refine((data) => data.name !== undefined || data.phone !== undefined, {
  message: 'Provide at least one field to update.',
})
