import { z } from 'zod'

/**
 * Reusable UUID validator
 */
export const uuidSchema = z
  .string()
  .uuid({ message: 'Invalid ID format' })

/**
 * Normalised, trimmed email validator
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Please enter a valid email address' })
  .max(255, { message: 'Email must be at most 255 characters' })

/**
 * Flexible phone validator supporting Ethiopian (+251 / 09 / 07) and international formats
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?[0-9\s\-()]{7,25})$/, {
    message: 'Please enter a valid phone number (e.g. +251 91 123 4567 or 0911234567)',
  })

/**
 * Optional phone validator that accepts empty string, undefined, or valid phone
 */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || /^(\+?[0-9\s\-()]{7,25})$/.test(val),
    {
      message: 'Please enter a valid phone number (e.g. +251 91 123 4567 or 0911234567)',
    }
  )

/**
 * Password validator enforcing length constraints
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be at most 128 characters' })

/**
 * Required non-empty string with trimmed whitespace
 */
export const requiredString = (fieldName: string, minLength = 1, maxLength = 255) =>
  z
    .string()
    .trim()
    .min(minLength, { message: `${fieldName} is required` })
    .max(maxLength, { message: `${fieldName} must be at most ${maxLength} characters` })

/**
 * Positive decimal/number validator (e.g. unit prices, costs, totals)
 */
export const positiveAmountSchema = z.coerce
  .number({ message: 'Amount must be a valid number' })
  .positive({ message: 'Amount must be greater than zero' })

/**
 * Non-negative decimal/number validator (e.g. discounts, tax, balance)
 */
export const nonNegativeAmountSchema = z.coerce
  .number({ message: 'Amount must be a valid number' })
  .min(0, { message: 'Amount cannot be negative' })

/**
 * Positive integer validator (e.g. item quantities, packs)
 */
export const positiveIntegerSchema = z.coerce
  .number({ message: 'Quantity must be a valid number' })
  .int({ message: 'Quantity must be an integer' })
  .positive({ message: 'Quantity must be at least 1' })

/**
 * Non-negative integer validator (e.g. stock, delivered quantity, rejected count)
 */
export const nonNegativeIntegerSchema = z.coerce
  .number({ message: 'Must be a valid number' })
  .int({ message: 'Must be an integer' })
  .min(0, { message: 'Cannot be negative' })

/**
 * Standard pagination and search query schema
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Date range filter schema
 */
export const dateRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to
      }
      return true
    },
    {
      message: 'End date must be on or after start date',
      path: ['to'],
    }
  )

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type DateRange = z.infer<typeof dateRangeSchema>
