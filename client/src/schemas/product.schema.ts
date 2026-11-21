import { z } from 'zod'
import {
  nonNegativeAmountSchema,
  nonNegativeIntegerSchema,
  positiveAmountSchema,
  positiveIntegerSchema,
  requiredString,
  uuidSchema,
} from './common.schema'
import { Dimension } from '../types/enums'

export const unitOfMeasureSchema = z.object({
  name: requiredString('Unit name', 1, 50),
  code: requiredString('Unit code', 1, 20),
  dimension: z.enum([
    Dimension.MASS,
    Dimension.VOLUME,
    Dimension.COUNT,
    Dimension.OTHER,
  ]),
})

export const materialSchema = z.object({
  name: requiredString('Material name', 2, 150),
  code: z.string().trim().max(50).optional(),
  categoryId: uuidSchema.optional(),
  uomId: uuidSchema,
  minStockLevel: nonNegativeAmountSchema.default(0),
  reorderPoint: nonNegativeAmountSchema.default(0),
  costPerUnit: nonNegativeAmountSchema.default(0),
  isActive: z.boolean().default(true),
})

export const updateMaterialSchema = materialSchema.partial()

export const finishedProductSchema = z.object({
  name: requiredString('Product name (e.g. Teff Injera)', 2, 150),
  code: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  uomId: uuidSchema,
  unitPrice: positiveAmountSchema,
  costPrice: nonNegativeAmountSchema.default(0),
  minStockLevel: nonNegativeIntegerSchema.default(0),
  shelfLifeHours: positiveIntegerSchema.optional(),
  isActive: z.boolean().default(true),
})

export const updateFinishedProductSchema = finishedProductSchema.partial()

export const recipeIngredientSchema = z.object({
  materialId: uuidSchema,
  quantity: positiveAmountSchema,
  uomId: uuidSchema,
  wastagePercentage: z.coerce
    .number()
    .min(0, { message: 'Wastage percentage cannot be negative' })
    .max(100, { message: 'Wastage percentage cannot exceed 100%' })
    .default(0),
})

export const recipeSchema = z.object({
  productId: uuidSchema,
  name: requiredString('Recipe name', 2, 150),
  description: z.string().trim().max(500).optional(),
  yieldQuantity: positiveAmountSchema,
  yieldUomId: uuidSchema,
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, { message: 'Recipe must contain at least one ingredient' }),
})

export const updateRecipeSchema = recipeSchema.partial()

export type UnitOfMeasureInput = z.infer<typeof unitOfMeasureSchema>
export type MaterialInput = z.infer<typeof materialSchema>
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>
export type FinishedProductInput = z.infer<typeof finishedProductSchema>
export type UpdateFinishedProductInput = z.infer<typeof updateFinishedProductSchema>
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>
export type RecipeInput = z.infer<typeof recipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
