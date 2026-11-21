import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 4: Recipes and Mixed Teff Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  let businessAId = ''
  let businessBId = ''
  let ownerAId = ''
  let ownerBId = ''

  let branchAId = ''
  let unitKgId = ''
  let unitPcsId = ''
  let matWhiteTeffId = ''
  let matBrownTeffId = ''
  let matErshoId = ''
  let supplierAId = ''
  let lotWhiteId = ''
  let lotBrownId = ''

  let productId = ''
  let recipeId = ''
  let blendOpId = ''
  let blendLotId = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)

    if (businessIds.length > 0) {
      await prisma.blendOutput.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.blendInput.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.blendOperation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.recipeIngredient.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.recipeVersion.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.recipe.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.finishedProduct.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialLotMovement.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialLot.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.purchaseItem.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.purchase.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.supplier.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.material.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialCategory.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.unitOfMeasure.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
    await prisma.$disconnect()
  })

  await t.test('1. Setup Tenant A and Tenant B environment with raw materials and storage lots', async () => {
    // Tenant A
    const regA = await agentA.post('/api/auth/register', {
      email: `owner-rcp-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Recipe Owner A',
      businessName: 'Addis Sheger Recipe Bakery',
    })
    assert.equal(regA.status, 201)
    businessAId = regA.body.data.business.id
    ownerAId = regA.body.data.user.id

    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Mixing & Mitad Station',
      code: 'STATION-01',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Tenant B
    const regB = await agentB.post('/api/auth/register', {
      email: `owner-rcp-b-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Recipe Owner B',
      businessName: 'Bole Flour & Baking Co',
    })
    assert.equal(regB.status, 201)
    businessBId = regB.body.data.business.id
    ownerBId = regB.body.data.user.id

    // Setup Units
    const kgRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(kgRes.status, 201)
    unitKgId = kgRes.body.data.id

    const pcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(pcsRes.status, 201)
    unitPcsId = pcsRes.body.data.id

    // Setup Category & Materials
    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Grains & Ferments',
    })
    assert.equal(catRes.status, 201)
    const catId = catRes.body.data.id

    const matWhiteRes = await agentA.post('/api/materials', {
      name: 'White Teff Magna',
      categoryId: catId,
      defaultUnitId: unitKgId,
      minimumStock: 50,
    })
    assert.equal(matWhiteRes.status, 201)
    matWhiteTeffId = matWhiteRes.body.data.id

    const matBrownRes = await agentA.post('/api/materials', {
      name: 'Brown Teff Tikur',
      categoryId: catId,
      defaultUnitId: unitKgId,
      minimumStock: 50,
    })
    assert.equal(matBrownRes.status, 201)
    matBrownTeffId = matBrownRes.body.data.id

    const matErshoRes = await agentA.post('/api/materials', {
      name: 'Ersho Yeast Culture',
      categoryId: catId,
      defaultUnitId: unitKgId,
      minimumStock: 10,
    })
    assert.equal(matErshoRes.status, 201)
    matErshoId = matErshoRes.body.data.id

    // Setup Supplier & Ingest Material Lots
    const supRes = await agentA.post('/api/materials/suppliers', {
      name: 'Bishoftu Grain Producers Union',
    })
    assert.equal(supRes.status, 201)
    supplierAId = supRes.body.data.id

    // Ingest White Teff Lot: 100 kg @ 180 ETB/kg
    const poWhite = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supplierAId,
      purchaseNumber: 'PO-WHITE-100',
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 0,
      receiveImmediately: true,
      items: [
        {
          materialId: matWhiteTeffId,
          unitId: unitKgId,
          grossQuantity: 100,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 18000, // 180 ETB/kg
        },
      ],
    })
    assert.equal(poWhite.status, 201)

    // Ingest Brown Teff Lot: 100 kg @ 140 ETB/kg
    const poBrown = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supplierAId,
      purchaseNumber: 'PO-BROWN-100',
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 0,
      receiveImmediately: true,
      items: [
        {
          materialId: matBrownTeffId,
          unitId: unitKgId,
          grossQuantity: 100,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 14000, // 140 ETB/kg
        },
      ],
    })
    assert.equal(poBrown.status, 201)

    // Retrieve the lot IDs
    const lotsRes = await agentA.get('/api/materials/lots')
    assert.equal(lotsRes.status, 200)
    const whiteLot = lotsRes.body.data.find((l: any) => l.materialId === matWhiteTeffId)
    const brownLot = lotsRes.body.data.find((l: any) => l.materialId === matBrownTeffId)
    assert.ok(whiteLot && brownLot)
    lotWhiteId = whiteLot.id
    lotBrownId = brownLot.id
  })

  await t.test('2. Finished Product Catalog Management', async () => {
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Standard 50cm Clay Mitad Injera',
      productCode: 'INJ-STD-50',
      size: '50cm Diameter',
      unitId: unitPcsId,
      defaultSellingPrice: 25,
    })
    assert.equal(prodRes.status, 201)
    productId = prodRes.body.data.id

    // Duplicate product code rejected
    const dupRes = await agentA.post('/api/recipes/products', {
      name: 'Duplicate Injera Code',
      productCode: 'INJ-STD-50',
      unitId: unitPcsId,
      defaultSellingPrice: 30,
    })
    assert.equal(dupRes.status, 409)
  })

  await t.test('3. Recipe Creation with initial Version 1', async () => {
    // Reference batch: 100 kg total dough => Expected yield: 240 injera
    // Ingredients: 60 kg White Teff, 40 kg Brown Teff, 5 kg Ersho
    const recipeRes = await agentA.post('/api/recipes', {
      name: 'Classic Addis Mixed Teff Recipe',
      productId,
      branchId: branchAId,
      description: 'Signature 60/40 blend baked on electric or clay mitad.',
      referenceBatchQuantity: 100,
      expectedYield: 240,
      instructions: 'Ferment dough for 72 hours before absit cooking.',
      effectiveFrom: '2026-01-01',
      ingredients: [
        {
          materialId: matWhiteTeffId,
          unitId: unitKgId,
          expectedQuantity: 60,
          notes: '60% White Magna',
        },
        {
          materialId: matBrownTeffId,
          unitId: unitKgId,
          expectedQuantity: 40,
          notes: '40% Brown Tikur',
        },
        {
          materialId: matErshoId,
          unitId: unitKgId,
          expectedQuantity: 5,
          notes: 'Fermenting culture starter',
        },
      ],
    })
    assert.equal(recipeRes.status, 201)
    recipeId = recipeRes.body.data.id

    const v1 = recipeRes.body.data.currentVersion
    assert.equal(v1.versionNumber, 1)
    assert.equal(Number(v1.referenceBatchQuantity), 100)
    assert.equal(Number(v1.expectedYield), 240)
    assert.equal(v1.ingredients.length, 3)
  })

  await t.test('4. Immutable Versioning Invariant: Recipe update bumps version without mutating past versions', async () => {
    // Add Version 2: Modified recipe (70 kg White, 30 kg Brown, 4 kg Ersho, expected yield 250)
    const v2Res = await agentA.post(`/api/recipes/${recipeId}/versions`, {
      referenceBatchQuantity: 100,
      expectedYield: 250,
      instructions: 'Updated formulation: increased Magna ratio for lighter texture.',
      effectiveFrom: '2026-02-01',
      ingredients: [
        {
          materialId: matWhiteTeffId,
          unitId: unitKgId,
          expectedQuantity: 70,
        },
        {
          materialId: matBrownTeffId,
          unitId: unitKgId,
          expectedQuantity: 30,
        },
        {
          materialId: matErshoId,
          unitId: unitKgId,
          expectedQuantity: 4,
        },
      ],
    })
    assert.equal(v2Res.status, 201)
    assert.equal(v2Res.body.data.versionNumber, 2)
    assert.equal(Number(v2Res.body.data.expectedYield), 250)

    // Inspect full recipe version history
    const getRes = await agentA.get(`/api/recipes/${recipeId}`)
    assert.equal(getRes.status, 200)
    assert.equal(getRes.body.data.versions.length, 2)

    // Invariant Check: Version 1 remains intact and unmodified
    const foundV1 = getRes.body.data.versions.find((v: any) => v.versionNumber === 1)
    assert.ok(foundV1)
    assert.equal(Number(foundV1.expectedYield), 240)
    assert.equal(foundV1.ingredients.length, 3)
    const v1White = foundV1.ingredients.find((i: any) => i.materialId === matWhiteTeffId)
    assert.equal(Number(v1White.expectedQuantity), 60)

    // Invariant Check: Version 2 contains updated formulation
    const foundV2 = getRes.body.data.versions.find((v: any) => v.versionNumber === 2)
    assert.ok(foundV2)
    assert.equal(Number(foundV2.expectedYield), 250)
    const v2White = foundV2.ingredients.find((i: any) => i.materialId === matWhiteTeffId)
    assert.equal(Number(v2White.expectedQuantity), 70)
  })

  await t.test('5. Variable Batch Sizing & Scaling Invariant', async () => {
    // Reference batch is 100 kg. Planned batch is 250 kg (barrel capacity).
    // Scaling factor = 250 / 100 = 2.5
    // Version 1 yield: 240 * 2.5 = 600 injera
    // Version 1 White Teff: 60 * 2.5 = 150 kg
    // Version 1 Brown Teff: 40 * 2.5 = 100 kg
    // Version 1 Ersho: 5 * 2.5 = 12.5 kg
    const scaleRes = await agentA.post(`/api/recipes/${recipeId}/scale?versionNumber=1`, {
      plannedBatchQuantity: 250,
    })
    assert.equal(scaleRes.status, 200)
    assert.equal(scaleRes.body.data.scalingFactor, 2.5)
    assert.equal(scaleRes.body.data.scaledExpectedYield, 600)

    const scaledIngredients = scaleRes.body.data.scaledIngredients
    const scaledWhite = scaledIngredients.find((i: any) => i.materialId === matWhiteTeffId)
    const scaledBrown = scaledIngredients.find((i: any) => i.materialId === matBrownTeffId)
    const scaledErsho = scaledIngredients.find((i: any) => i.materialId === matErshoId)

    assert.equal(scaledWhite.scaledExpectedQuantity, 150)
    assert.equal(scaledBrown.scaledExpectedQuantity, 100)
    assert.equal(scaledErsho.scaledExpectedQuantity, 12.5)
  })

  await t.test('6. Pre-mixed Teff Blending: Insufficient Lot Stock Rejection', async () => {
    // Attempt blend consuming 500 kg from White Lot (which only has 100 kg available)
    const overBlendRes = await agentA.post('/api/recipes/blends', {
      branchId: branchAId,
      operationNumber: 'BLEND-FAIL-01',
      targetMaterialId: matWhiteTeffId,
      targetUnitId: unitKgId,
      processingLoss: 0,
      processingCost: 0,
      inputs: [
        {
          materialLotId: lotWhiteId,
          quantityConsumed: 500, // Excessive
        },
      ],
    })
    assert.equal(overBlendRes.status, 400)
    assert.equal(overBlendRes.body.error, 'INSUFFICIENT_LOT_STOCK')
  })

  await t.test('7. Pre-mixed Teff Blending: Mass Conservation, Cost Allocation, and Lot Generation', async () => {
    // Input 1: 60 kg White Teff from lotWhiteId @ 180 ETB/kg = 10,800 ETB
    // Input 2: 40 kg Brown Teff from lotBrownId @ 140 ETB/kg = 5,600 ETB
    // Total input weight = 100 kg
    // Total inputs cost = 16,400 ETB
    // Milling & Blending Overhead = 400 ETB
    // Total blend cost = 16,800 ETB
    // Processing loss = 2 kg (cleaning/dust loss during milling)
    // Usable output quantity = 100 - 2 = 98 kg
    // True unit cost = 16,800 / 98 = 171.4286 ETB/kg
    const blendRes = await agentA.post('/api/recipes/blends', {
      branchId: branchAId,
      operationNumber: 'BLEND-2026-001',
      operationDate: new Date().toISOString(),
      targetMaterialId: matWhiteTeffId,
      targetUnitId: unitKgId,
      processingLoss: 2,
      processingCost: 400,
      inputs: [
        {
          materialLotId: lotWhiteId,
          quantityConsumed: 60,
        },
        {
          materialLotId: lotBrownId,
          quantityConsumed: 40,
        },
      ],
    })
    assert.equal(blendRes.status, 201)
    blendOpId = blendRes.body.data.operation.id
    blendLotId = blendRes.body.data.blendLot.id

    assert.equal(Number(blendRes.body.data.outputQuantity), 98)
    assert.equal(Number(blendRes.body.data.blendUnitCost), 171.4286)
    assert.equal(Number(blendRes.body.data.totalBlendCost), 16800)

    // Verify source lots remaining quantities were deducted
    const whiteLotAfter = await prisma.materialLot.findUnique({ where: { id: lotWhiteId } })
    const brownLotAfter = await prisma.materialLot.findUnique({ where: { id: lotBrownId } })
    assert.equal(Number(whiteLotAfter?.remainingQuantity), 40) // 100 - 60 = 40
    assert.equal(Number(brownLotAfter?.remainingQuantity), 60) // 100 - 40 = 60

    // Verify movements on source lots and blend lot
    const lot1Movements = await prisma.materialLotMovement.findMany({
      where: { materialLotId: lotWhiteId },
      orderBy: { occurredAt: 'desc' },
    })
    assert.equal(lot1Movements[0]?.movementType, 'BLEND_INPUT')
    assert.equal(Number(lot1Movements[0]?.quantity), 60)

    const blendLotRecord = await prisma.materialLot.findUnique({ where: { id: blendLotId } })
    assert.ok(blendLotRecord)
    assert.equal(blendLotRecord.lotNumber, 'BLEND-BLEND-2026-001')
    assert.equal(Number(blendLotRecord.remainingQuantity), 98)
    assert.equal(Number(blendLotRecord.unitCost), 171.4286)
  })

  await t.test('8. Full Ancestry & Source Traceability Invariant', async () => {
    const blendDetailRes = await agentA.get(`/api/recipes/blends/${blendOpId}`)
    assert.equal(blendDetailRes.status, 200)

    const blendData = blendDetailRes.body.data
    assert.equal(blendData.inputs.length, 2)
    assert.equal(Number(blendData.outputQuantity), 98)
    assert.equal(Number(blendData.processingLoss), 2)
    assert.equal(Number(blendData.processingCost), 400)
    assert.equal(blendData.output.lotNumber, 'BLEND-BLEND-2026-001')

    // Invariant: Source lots are explicitly inspectable
    const inputLots = blendData.inputs.map((i: any) => i.materialLotId)
    assert.ok(inputLots.includes(lotWhiteId))
    assert.ok(inputLots.includes(lotBrownId))
  })

  await t.test('9. Cross-Tenant Isolation: Tenant B cannot access Tenant A recipes or blends', async () => {
    // Tenant B attempts to read Tenant A's recipe
    const getRes = await agentB.get(`/api/recipes/${recipeId}`)
    assert.equal(getRes.status, 404)

    // Tenant B attempts to scale Tenant A's recipe
    const scaleRes = await agentB.post(`/api/recipes/${recipeId}/scale`, {
      plannedBatchQuantity: 200,
    })
    assert.equal(scaleRes.status, 404)

    // Tenant B attempts to read Tenant A's blend operation
    const blendRes = await agentB.get(`/api/recipes/blends/${blendOpId}`)
    assert.equal(blendRes.status, 404)

    // Tenant B list recipes -> should be empty
    const listRes = await agentB.get('/api/recipes')
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.data.length, 0)
  })
})
