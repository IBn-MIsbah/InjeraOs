import { z } from 'zod'
import {
  emailSchema,
  optionalPhoneSchema,
  passwordSchema,
  uuidSchema,
} from './common.schema'

/**
 * Client-side schema for user sign-in
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .max(128, { message: 'Password cannot exceed 128 characters' }),
  businessId: uuidSchema.optional(),
  deviceKey: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(150).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Client-side schema for user registration and bakery onboarding
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(150, { message: 'Full name cannot exceed 150 characters' }),
  email: emailSchema,
  password: passwordSchema,
  phone: optionalPhoneSchema,
  businessName: z
    .string()
    .trim()
    .max(150, { message: 'Bakery name cannot exceed 150 characters' })
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: 'Bakery name must be at least 2 characters if provided',
    }),
  deviceKey: z.string().trim().max(128).optional(),
  deviceName: z.string().trim().max(150).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Schema for password change within active session
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: 'Current password is required' }),
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Schema for requesting a password reset email
 */
export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
})

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>

/**
 * Schema for resetting password with verification token
 */
export const resetPasswordConfirmSchema = z
  .object({
    token: z.string().min(1, { message: 'Reset token is required' }),
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>
