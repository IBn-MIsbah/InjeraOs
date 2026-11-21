import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  createBlendOperationSchema,
  createFinishedProductSchema,
  createRecipeSchema,
  createRecipeVersionSchema,
  scaleRecipeSchema,
  type CreateBlendOperationInput,
  type CreateFinishedProductInput,
  type CreateRecipeInput,
  type CreateRecipeVersionInput,
  type ScaleRecipeInput,
} from './recipes.schema.js'

export const recipesRouter: ExpressRouter = Router()

// All recipe operations require authenticated identity
recipesRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Finished Products Catalog
 * -------------------------------------------------------------
 */

// List finished products
recipesRouter.get('/products', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const products = await prisma.finishedProduct.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })

  const units = await prisma.unitOfMeasure.findMany({ where: { businessId } })
  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))

  const enriched = products.map((p) => ({
    ...p,
    unitSymbol: unitMap.get(p.unitId) ?? 'pcs',
  }))

  return res.json({ data: enriched })
})

// Create finished product
recipesRouter.post(
  '/products',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createFinishedProductSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateFinishedProductInput

    const existing = await prisma.finishedProduct.findUnique({
      where: { businessId_productCode: { businessId, productCode: input.productCode } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A product with this product code already exists.' })
    }

    const product = await prisma.finishedProduct.create({
      data: {
        businessId,
        name: input.name,
        productCode: input.productCode,
        size: input.size ?? null,
        unitId: input.unitId,
        defaultSellingPrice: input.defaultSellingPrice,
        isActive: input.isActive ?? true,
      },
    })

    return res.status(201).json({ data: product })
  }
)

/**
 * -------------------------------------------------------------
 * Blending Operations & Pre-Mixed Teff
 * -------------------------------------------------------------
 */

// List blend operations
recipesRouter.get('/blends', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const blends = await prisma.blendOperation.findMany({
    where: { businessId },
    orderBy: { operationDate: 'desc' },
  })

  const blendIds = blends.map((b) => b.id)
  const [inputs, outputs, branches] = await Promise.all([
    prisma.blendInput.findMany({ where: { blendOperationId: { in: blendIds }, businessId } }),
    prisma.blendOutput.findMany({ where: { blendOperationId: { in: blendIds }, businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const inputsByBlend = new Map<string, typeof inputs>()
  for (const inp of inputs) {
    const arr = inputsByBlend.get(inp.blendOperationId) ?? []
    arr.push(inp)
    inputsByBlend.set(inp.blendOperationId, arr)
  }

  const outputByBlend = new Map<string, (typeof outputs)[0]>()
  for (const out of outputs) {
    outputByBlend.set(out.blendOperationId, out)
  }

  const enriched = blends.map((b) => ({
    ...b,
    branchName: branchMap.get(b.branchId) ?? 'Unknown Branch',
    inputsCount: inputsByBlend.get(b.id)?.length ?? 0,
    output: outputByBlend.get(b.id) ?? null,
  }))

  return res.json({ data: enriched })
})

// Get single blend operation with full lot ancestry and inputs
recipesRouter.get('/blends/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const blend = await prisma.blendOperation.findFirst({
    where: { id, businessId },
  })

  if (!blend) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Blend operation not found.' })
  }

  const [inputs, output, branch] = await Promise.all([
    prisma.blendInput.findMany({ where: { blendOperationId: id, businessId } }),
    prisma.blendOutput.findFirst({ where: { blendOperationId: id, businessId } }),
    prisma.branch.findFirst({ where: { id: blend.branchId, businessId } }),
  ])

  // Retrieve source lot details for full ancestry
  const lotIds = inputs.map((i) => i.materialLotId)
  if (output?.materialLotId) lotIds.push(output.materialLotId)

  const lots = await prisma.materialLot.findMany({
    where: { id: { in: lotIds }, businessId },
  })
  const lotMap = new Map(lots.map((l) => [l.id, l]))

  const enrichedInputs = inputs.map((inp) => {
    const lot = lotMap.get(inp.materialLotId)
    return {
      ...inp,
      lotNumber: lot?.lotNumber ?? 'Unknown',
      materialId: lot?.materialId,
      varietyId: lot?.varietyId,
    }
  })

  const outputLot = output ? lotMap.get(output.materialLotId) : null

  return res.json({
    data: {
      ...blend,
      branchName: branch?.name ?? 'Unknown',
      inputs: enrichedInputs,
      output: output
        ? {
            ...output,
            lotNumber: outputLot?.lotNumber,
          }
        : null,
    },
  })
})

// Execute a blend operation (conserves mass, calculates unit cost, creates blend lot)
recipesRouter.post(
  '/blends',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createBlendOperationSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as CreateBlendOperationInput

    // Verify unique operation number
    const existing = await prisma.blendOperation.findUnique({
      where: { businessId_operationNumber: { businessId, operationNumber: input.operationNumber } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'An operation with this number already exists.' })
    }

    // Verify all input lots exist and have sufficient available stock
    const lotIds = input.inputs.map((i) => i.materialLotId)
    const lots = await prisma.materialLot.findMany({
      where: { id: { in: lotIds }, businessId },
    })
    const lotMap = new Map(lots.map((l) => [l.id, l]))

    let totalInputQuantity = 0
    let totalInputsCost = 0
    const calculatedInputs: {
      materialLotId: string
      quantityConsumed: number
      unitCostSnapshot: number
      totalCost: number
      lot: (typeof lots)[0]
    }[] = []

    for (const inp of input.inputs) {
      const lot = lotMap.get(inp.materialLotId)
      if (!lot) {
        return res.status(404).json({ error: 'LOT_NOT_FOUND', message: `Material lot ${inp.materialLotId} not found.` })
      }

      const available = Number(lot.remainingQuantity)
      if (available < inp.quantityConsumed) {
        return res.status(400).json({
          error: 'INSUFFICIENT_LOT_STOCK',
          message: `Cannot consume ${inp.quantityConsumed} from lot ${lot.lotNumber}. Available balance is only ${available}.`,
        })
      }

      const unitCost = Number(lot.unitCost)
      const cost = Number((inp.quantityConsumed * unitCost).toFixed(4))
      totalInputQuantity += inp.quantityConsumed
      totalInputsCost += cost

      calculatedInputs.push({
        materialLotId: lot.id,
        quantityConsumed: inp.quantityConsumed,
        unitCostSnapshot: unitCost,
        totalCost: cost,
        lot,
      })
    }

    const processingLoss = input.processingLoss ?? 0
    const processingCost = input.processingCost ?? 0
    const outputQuantity = Number((totalInputQuantity - processingLoss).toFixed(4))

    if (outputQuantity <= 0) {
      return res.status(400).json({
        error: 'INVALID_OUTPUT_QUANTITY',
        message: `Output quantity must be positive. Total inputs (${totalInputQuantity}) minus loss (${processingLoss}) = ${outputQuantity}.`,
      })
    }

    const totalBlendCost = Number((totalInputsCost + processingCost).toFixed(4))
    const blendUnitCost = Number((totalBlendCost / outputQuantity).toFixed(4))

    // Execute in transaction: deduct source lots, record movements, create blend lot
    const result = await prisma.$transaction(async (tx) => {
      const blendOp = await tx.blendOperation.create({
        data: {
          businessId,
          branchId: input.branchId,
          operationNumber: input.operationNumber,
          operationDate: input.operationDate ? new Date(input.operationDate) : new Date(),
          outputQuantity,
          processingLoss,
          processingCost,
          status: 'COMPLETED',
          createdById: userId,
        },
      })

      // Record input rows and deduct stock from source lots
      for (const inp of calculatedInputs) {
        await tx.blendInput.create({
          data: {
            businessId,
            blendOperationId: blendOp.id,
            materialLotId: inp.materialLotId,
            quantityConsumed: inp.quantityConsumed,
            unitCostSnapshot: inp.unitCostSnapshot,
            totalCost: inp.totalCost,
          },
        })

        const newRemaining = Number((Number(inp.lot.remainingQuantity) - inp.quantityConsumed).toFixed(4))
        const newStatus = newRemaining === 0 ? 'DEPLETED' : 'AVAILABLE'

        await tx.materialLot.update({
          where: { id: inp.materialLotId },
          data: {
            remainingQuantity: newRemaining,
            status: newStatus,
          },
        })

        await tx.materialLotMovement.create({
          data: {
            businessId,
            materialLotId: inp.materialLotId,
            movementType: 'BLEND_INPUT',
            quantity: inp.quantityConsumed,
            unitCostSnapshot: inp.unitCostSnapshot,
            totalCost: inp.totalCost,
            referenceType: 'BLEND_OPERATION',
            referenceId: blendOp.id,
            createdById: userId,
          },
        })
      }

      // Create new distinct blend lot
      const blendLotNumber = `BLEND-${input.operationNumber}`
      const blendLot = await tx.materialLot.create({
        data: {
          businessId,
          branchId: input.branchId,
          materialId: input.targetMaterialId,
          varietyId: input.targetVarietyId ?? null,
          blendOperationId: blendOp.id,
          lotNumber: blendLotNumber,
          originalQuantity: outputQuantity,
          remainingQuantity: outputQuantity,
          unitId: input.targetUnitId,
          totalAcquisitionCost: totalBlendCost,
          unitCost: blendUnitCost,
          receivedAt: new Date(),
          status: 'AVAILABLE',
        },
      })

      // Log BLEND_OUTPUT movement
      await tx.materialLotMovement.create({
        data: {
          businessId,
          materialLotId: blendLot.id,
          movementType: 'BLEND_OUTPUT',
          quantity: outputQuantity,
          unitCostSnapshot: blendUnitCost,
          totalCost: totalBlendCost,
          referenceType: 'BLEND_OPERATION',
          referenceId: blendOp.id,
          createdById: userId,
        },
      })

      // Link output in blend_outputs
      await tx.blendOutput.create({
        data: {
          businessId,
          blendOperationId: blendOp.id,
          materialLotId: blendLot.id,
          outputQuantity,
          totalCost: totalBlendCost,
          unitCost: blendUnitCost,
        },
      })

      return { blendOp, blendLot }
    })

    return res.status(201).json({
      message: 'Blend operation completed successfully. Traceable blend lot created.',
      data: {
        operation: result.blendOp,
        blendLot: result.blendLot,
        outputQuantity,
        blendUnitCost,
        totalBlendCost,
      },
    })
  }
)

/**
 * -------------------------------------------------------------
 * Recipe Catalog & Versions
 * -------------------------------------------------------------
 */

// List recipes with active latest version
recipesRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const [recipes, products, branches] = await Promise.all([
    prisma.recipe.findMany({
      where: { businessId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    }),
    prisma.finishedProduct.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
  ])

  const productMap = new Map(products.map((p) => [p.id, p]))
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))

  const recipeIds = recipes.map((r) => r.id)
  const allVersions = await prisma.recipeVersion.findMany({
    where: { recipeId: { in: recipeIds }, businessId },
    orderBy: { versionNumber: 'desc' },
  })

  // Get latest version per recipe
  const latestVersionByRecipe = new Map<string, (typeof allVersions)[0]>()
  for (const v of allVersions) {
    if (!latestVersionByRecipe.has(v.recipeId)) {
      latestVersionByRecipe.set(v.recipeId, v)
    }
  }

  const enriched = recipes.map((r) => {
    const latest = latestVersionByRecipe.get(r.id)
    const product = productMap.get(r.productId)
    return {
      ...r,
      productName: product?.name ?? 'Unknown Product',
      productCode: product?.productCode ?? '',
      branchName: r.branchId ? (branchMap.get(r.branchId) ?? 'All Branches') : 'All Branches',
      currentVersionNumber: latest?.versionNumber ?? 1,
      referenceBatchQuantity: latest ? Number(latest.referenceBatchQuantity) : 0,
      expectedYield: latest ? Number(latest.expectedYield) : 0,
      effectiveFrom: latest?.effectiveFrom ?? null,
    }
  })

  return res.json({ data: enriched })
})

// Create recipe with initial Version 1
recipesRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createRecipeSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const input = req.body as CreateRecipeInput

    // Verify product exists and belongs to business
    const product = await prisma.finishedProduct.findFirst({
      where: { id: input.productId, businessId },
    })

    if (!product) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Finished product not found.' })
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const createdRecipe = await tx.recipe.create({
        data: {
          businessId,
          productId: input.productId,
          branchId: input.branchId ?? null,
          name: input.name,
          description: input.description ?? null,
          status: 'ACTIVE',
        },
      })

      const effectiveDate = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date()

      const version = await tx.recipeVersion.create({
        data: {
          businessId,
          recipeId: createdRecipe.id,
          versionNumber: 1,
          referenceBatchQuantity: input.referenceBatchQuantity,
          expectedYield: input.expectedYield,
          instructions: input.instructions ?? null,
          effectiveFrom: effectiveDate,
          createdById: userId,
        },
      })

      const createdIngredients = []
      for (const ing of input.ingredients) {
        const createdIng = await tx.recipeIngredient.create({
          data: {
            businessId,
            recipeVersionId: version.id,
            materialId: ing.materialId,
            varietyId: ing.varietyId ?? null,
            expectedQuantity: ing.expectedQuantity,
            unitId: ing.unitId,
            notes: ing.notes ?? null,
          },
        })
        createdIngredients.push(createdIng)
      }

      return {
        ...createdRecipe,
        currentVersion: {
          ...version,
          ingredients: createdIngredients,
        },
      }
    })

    return res.status(201).json({ data: recipe })
  }
)

// Get single recipe with all versions and their ingredients
recipesRouter.get('/:id', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const id = req.params.id as string

  const recipe = await prisma.recipe.findFirst({
    where: { id, businessId },
  })

  if (!recipe) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Recipe not found.' })
  }

  const [product, versions, materials, varieties, units] = await Promise.all([
    prisma.finishedProduct.findFirst({ where: { id: recipe.productId, businessId } }),
    prisma.recipeVersion.findMany({
      where: { recipeId: id, businessId },
      orderBy: { versionNumber: 'desc' },
    }),
    prisma.material.findMany({ where: { businessId } }),
    prisma.materialVariety.findMany({ where: { businessId } }),
    prisma.unitOfMeasure.findMany({ where: { businessId } }),
  ])

  const versionIds = versions.map((v) => v.id)
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { recipeVersionId: { in: versionIds }, businessId },
  })

  const matMap = new Map(materials.map((m) => [m.id, m.name]))
  const varMap = new Map(varieties.map((v) => [v.id, v.name]))
  const unitMap = new Map(units.map((u) => [u.id, u.symbol]))

  const ingredientsByVersion = new Map<string, typeof ingredients>()
  for (const ing of ingredients) {
    const arr = ingredientsByVersion.get(ing.recipeVersionId) ?? []
    arr.push(ing)
    ingredientsByVersion.set(ing.recipeVersionId, arr)
  }

  const enrichedVersions = versions.map((v) => ({
    ...v,
    ingredients: (ingredientsByVersion.get(v.id) ?? []).map((ing) => ({
      ...ing,
      materialName: matMap.get(ing.materialId) ?? 'Unknown Material',
      varietyName: ing.varietyId ? (varMap.get(ing.varietyId) ?? null) : null,
      unitSymbol: unitMap.get(ing.unitId) ?? 'unit',
    })),
  }))

  return res.json({
    data: {
      ...recipe,
      productName: product?.name ?? 'Unknown Product',
      versions: enrichedVersions,
      currentVersion: enrichedVersions[0] ?? null,
    },
  })
})

// Create new recipe version (Version Bump - Preserves historical versions immutably)
recipesRouter.post(
  '/:id/versions',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createRecipeVersionSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const userId = req.auth!.userId
    const recipeId = req.params.id as string
    const input = req.body as CreateRecipeVersionInput

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, businessId },
    })

    if (!recipe) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Recipe not found.' })
    }

    // Find latest version number
    const latestVersion = await prisma.recipeVersion.findFirst({
      where: { recipeId, businessId },
      orderBy: { versionNumber: 'desc' },
    })

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1
    const effectiveDate = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date()

    const newVersion = await prisma.$transaction(async (tx) => {
      const version = await tx.recipeVersion.create({
        data: {
          businessId,
          recipeId,
          versionNumber: nextVersionNumber,
          referenceBatchQuantity: input.referenceBatchQuantity,
          expectedYield: input.expectedYield,
          instructions: input.instructions ?? null,
          effectiveFrom: effectiveDate,
          createdById: userId,
        },
      })

      const createdIngredients = []
      for (const ing of input.ingredients) {
        const createdIng = await tx.recipeIngredient.create({
          data: {
            businessId,
            recipeVersionId: version.id,
            materialId: ing.materialId,
            varietyId: ing.varietyId ?? null,
            expectedQuantity: ing.expectedQuantity,
            unitId: ing.unitId,
            notes: ing.notes ?? null,
          },
        })
        createdIngredients.push(createdIng)
      }

      return {
        ...version,
        ingredients: createdIngredients,
      }
    })

    return res.status(201).json({
      message: `Recipe version ${nextVersionNumber} created successfully.`,
      data: newVersion,
    })
  }
)

// Calculate batch scaling for variable barrel capacities
recipesRouter.post(
  '/:id/scale',
  validateBody(scaleRecipeSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const recipeId = req.params.id as string
    const input = req.body as ScaleRecipeInput
    const versionNumberParam = req.query.versionNumber
      ? Number(req.query.versionNumber)
      : undefined

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, businessId },
    })

    if (!recipe) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Recipe not found.' })
    }

    const version = await prisma.recipeVersion.findFirst({
      where: {
        recipeId,
        businessId,
        ...(versionNumberParam !== undefined && { versionNumber: versionNumberParam }),
      },
      orderBy: { versionNumber: 'desc' },
    })

    if (!version) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Recipe version not found.' })
    }

    const [ingredients, materials, units] = await Promise.all([
      prisma.recipeIngredient.findMany({ where: { recipeVersionId: version.id, businessId } }),
      prisma.material.findMany({ where: { businessId } }),
      prisma.unitOfMeasure.findMany({ where: { businessId } }),
    ])

    const matMap = new Map(materials.map((m) => [m.id, m.name]))
    const unitMap = new Map(units.map((u) => [u.id, u.symbol]))

    const refQty = Number(version.referenceBatchQuantity)
    const scalingFactor = Number((input.plannedBatchQuantity / refQty).toFixed(6))
    const scaledExpectedYield = Number((Number(version.expectedYield) * scalingFactor).toFixed(2))

    const scaledIngredients = ingredients.map((ing) => {
      const baseExpected = Number(ing.expectedQuantity)
      const scaledQty = Number((baseExpected * scalingFactor).toFixed(4))
      return {
        ...ing,
        materialName: matMap.get(ing.materialId) ?? 'Unknown Material',
        unitSymbol: unitMap.get(ing.unitId) ?? 'unit',
        baseExpectedQuantity: baseExpected,
        scaledExpectedQuantity: scaledQty,
      }
    })

    return res.json({
      data: {
        recipeId,
        recipeName: recipe.name,
        versionNumber: version.versionNumber,
        referenceBatchQuantity: refQty,
        plannedBatchQuantity: input.plannedBatchQuantity,
        scalingFactor,
        baseExpectedYield: Number(version.expectedYield),
        scaledExpectedYield,
        scaledIngredients,
      },
    })
  }
)
