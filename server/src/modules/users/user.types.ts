import type { z } from 'zod'
import type { createUserSchema, updateUserSchema, userIdParamsSchema } from './user.schema.js'

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserIdParams = z.infer<typeof userIdParamsSchema>
