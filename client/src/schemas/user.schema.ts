import { z } from 'zod'
import {
  emailSchema,
  optionalPhoneSchema,
  phoneSchema,
  uuidSchema,
} from './common.schema'

export const userIdParamsSchema = z.object({
  userId: uuidSchema,
})

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(150, { message: 'Name cannot exceed 150 characters' }),
  email: emailSchema,
  phone: optionalPhoneSchema,
})

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(150, { message: 'Name cannot exceed 150 characters' })
      .optional(),
    phone: phoneSchema.nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.phone !== undefined, {
    message: 'Provide at least one field to update',
  })

export const userProfileSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: emailSchema,
  phone: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserProfileData = z.infer<typeof userProfileSchema>
