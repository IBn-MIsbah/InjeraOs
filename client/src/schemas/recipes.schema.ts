import { z } from 'zod'

// Finished Product Schema
export const createFinishedProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(150),
  productCode: z.string().trim().min(1, 'Product code is required').max(50),
  size: z.string().trim().max(100).optional(),
  unitId: z.string().uuid('Please select a unit of measure'),
  defaultSellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  isActive: z.boolean().default(true),
})

export type CreateFinishedProductInput = z.infer<typeof createFinishedProductSchema>

// Recipe Ingredient Input Schema
export const recipeIngredientInputSchema = z.object({
  materialId: z.string().uuid('Please select a material'),
  varietyId: z.string().optional().nullable(),
  unitId: z.string().uuid('Please select a unit'),
  expectedQuantity: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().trim().max(300).optional().nullable(),
})

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>

// Create Recipe (with Version 1) Schema
export const createRecipeSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required').max(150),
  productId: z.string().uuid('Please select a finished product'),
  branchId: z.string().optional().nullable(),
  description: z.string().trim().max(500).optional(),
  referenceBatchQuantity: z.number().positive('Reference batch quantity must be greater than 0'),
  expectedYield: z.number().positive('Expected yield must be greater than 0'),
  instructions: z.string().trim().optional(),
  effectiveFrom: z.string().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1, 'At least one ingredient is required'),
})

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>

// Create New Recipe Version Schema
export const createRecipeVersionSchema = z.object({
  referenceBatchQuantity: z.number().positive('Reference batch quantity must be greater than 0'),
  expectedYield: z.number().positive('Expected yield must be greater than 0'),
  instructions: z.string().trim().optional(),
  effectiveFrom: z.string().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1, 'At least one ingredient is required'),
})

export type CreateRecipeVersionInput = z.infer<typeof createRecipeVersionSchema>

// Batch Scaling Schema
export const scaleRecipeSchema = z.object({
  plannedBatchQuantity: z.number().positive('Planned batch quantity must be greater than 0'),
})

export type ScaleRecipeInput = z.infer<typeof scaleRecipeSchema>

// Blend Operation Input Item Schema
export const blendInputItemSchema = z.object({
  materialLotId: z.string().uuid('Please select a material lot'),
  quantityConsumed: z.number().positive('Quantity consumed must be greater than 0'),
})

export type BlendInputItem = z.infer<typeof blendInputItemSchema>

// Create Blend Operation Schema
export const createBlendOperationSchema = z.object({
  branchId: z.string().uuid('Please select a branch'),
  operationNumber: z.string().trim().min(1, 'Operation number is required').max(50),
  operationDate: z.string().optional(),
  targetMaterialId: z.string().uuid('Please select target mixed material'),
  targetVarietyId: z.string().optional().nullable(),
  targetUnitId: z.string().uuid('Please select target unit'),
  processingLoss: z.number().min(0, 'Loss cannot be negative'),
  processingCost: z.number().min(0, 'Processing cost cannot be negative'),
  inputs: z.array(blendInputItemSchema).min(1, 'At least one input lot is required'),
})

export type CreateBlendOperationInput = z.infer<typeof createBlendOperationSchema>
