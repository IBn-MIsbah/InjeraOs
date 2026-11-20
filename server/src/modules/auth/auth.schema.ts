import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
  password: z.string().min(1, 'Password is required').max(128),
  businessId: z.uuid().optional(),
  deviceKey: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(150).optional(),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.email().trim().toLowerCase().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().trim().min(7).max(30).optional(),
  businessName: z.string().trim().min(2).max(150).optional(),
  deviceKey: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(150).optional(),
})

export const sessionIdParamsSchema = z.object({
  sessionId: z.uuid(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>
