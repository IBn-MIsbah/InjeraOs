import { z } from 'zod'

// Finished Product Schema
export const createFinishedProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  productCode: z.string().trim().min(1, 'Product code is required').max(50),
  size: z.string().trim().max(100).optional().nullable(),
  unitId: z.string().uuid('Valid unitId is required'),
  defaultSellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  isActive: z.boolean().default(true),
})

export type CreateFinishedProductInput = z.infer<typeof createFinishedProductSchema>

// Recipe Ingredient Schema
export const recipeIngredientInputSchema = z.object({
  materialId: z.string().uuid('Valid materialId is required'),
  varietyId: z.string().uuid('Valid varietyId is required').optional().nullable(),
  unitId: z.string().uuid('Valid unitId is required'),
  expectedQuantity: z.number().positive('Expected quantity must be greater than zero'),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>

// Create Recipe (with Version 1) Schema
export const createRecipeSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required').max(150),
  productId: z.string().uuid('Valid productId is required'),
  branchId: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  referenceBatchQuantity: z.number().positive('Reference batch quantity must be greater than zero'),
  expectedYield: z.number().positive('Expected yield must be greater than zero'),
  instructions: z.string().trim().optional().nullable(),
  effectiveFrom: z.string().or(z.date()).optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1, 'At least one ingredient is required'),
})

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>

// Create New Recipe Version Schema
export const createRecipeVersionSchema = z.object({
  referenceBatchQuantity: z.number().positive('Reference batch quantity must be greater than zero'),
  expectedYield: z.number().positive('Expected yield must be greater than zero'),
  instructions: z.string().trim().optional().nullable(),
  effectiveFrom: z.string().or(z.date()).optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1, 'At least one ingredient is required'),
})

export type CreateRecipeVersionInput = z.infer<typeof createRecipeVersionSchema>

// Scale Recipe Schema
export const scaleRecipeSchema = z.object({
  plannedBatchQuantity: z.number().positive('Planned batch quantity must be greater than zero'),
})

export type ScaleRecipeInput = z.infer<typeof scaleRecipeSchema>

// Blend Operation Input Lot Schema
export const blendInputItemSchema = z.object({
  materialLotId: z.string().uuid('Valid materialLotId is required'),
  quantityConsumed: z.number().positive('Quantity consumed must be greater than zero'),
})

export type BlendInputItem = z.infer<typeof blendInputItemSchema>

// Create Blend Operation Schema
export const createBlendOperationSchema = z.object({
  branchId: z.string().uuid('Valid branchId is required'),
  operationNumber: z.string().trim().min(1, 'Operation number is required').max(50),
  operationDate: z.string().or(z.date()).optional(),
  targetMaterialId: z.string().uuid('Target materialId is required'),
  targetVarietyId: z.string().uuid().optional().nullable(),
  targetUnitId: z.string().uuid('Target unitId is required'),
  processingLoss: z.number().nonnegative('Processing loss cannot be negative').default(0),
  processingCost: z.number().nonnegative('Processing cost cannot be negative').default(0),
  inputs: z.array(blendInputItemSchema).min(1, 'At least one input lot is required'),
})

export type CreateBlendOperationInput = z.infer<typeof createBlendOperationSchema>
