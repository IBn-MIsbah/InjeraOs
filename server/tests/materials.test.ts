import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 3: Materials and Purchasing Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  let businessAId = ''
  let businessBId = ''
  let ownerAId = ''
  let ownerBId = ''

  let branchAId = ''
  let categoryAId = ''
  let unitKgId = ''
  let unitGId = ''
  let unitPcsId = ''
  let materialTeffId = ''
  let varietyMagnaId = ''
  let supplierAId = ''
  let purchaseAId = ''
  let lot1Id = ''
  let lot2Id = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)

    if (businessIds.length > 0) {
      await prisma.materialLotMovement.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialLot.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.purchaseItem.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.purchase.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.supplier.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialVariety.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.material.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialCategory.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.unitOfMeasure.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
    await prisma.$disconnect()
  })

  await t.test('1. Setup Tenant A and Tenant B businesses and branches', async () => {
    const regA = await agentA.post('/api/auth/register', {
      email: `owner-mat-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Materials Owner A',
      businessName: 'Addis Sheger Milling & Baking',
    })
    assert.equal(regA.status, 201)
    businessAId = regA.body.data.business.id
    ownerAId = regA.body.data.user.id

    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Milling Facility',
      code: 'MILL-01',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    const regB = await agentB.post('/api/auth/register', {
      email: `owner-mat-b-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Materials Owner B',
      businessName: 'Bole Injera Cooperative',
    })
    assert.equal(regB.status, 201)
    businessBId = regB.body.data.business.id
    ownerBId = regB.body.data.user.id
  })

  await t.test('2. Material Categories and Units of Measure with Dimensional Protection', async () => {
    // Create Categories
    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Raw Teff Grain',
      description: 'Primary grain ingredients',
    })
    assert.equal(catRes.status, 201)
    categoryAId = catRes.body.data.id

    // Duplicate category rejected
    const dupCat = await agentA.post('/api/materials/categories', {
      name: 'Raw Teff Grain',
    })
    assert.equal(dupCat.status, 409)

    // Create Units of Measure
    const kgRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(kgRes.status, 201)
    unitKgId = kgRes.body.data.id

    const gRes = await agentA.post('/api/materials/units', {
      name: 'Gram',
      symbol: 'g',
      dimension: 'MASS',
      isBaseUnit: false,
    })
    assert.equal(gRes.status, 201)
    unitGId = gRes.body.data.id

    const pcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(pcsRes.status, 201)
    unitPcsId = pcsRes.body.data.id

    // Valid unit conversion: 2.5 kg -> 2500 g
    const convValid = await agentA.post('/api/materials/units/convert', {
      fromUnitId: unitKgId,
      toUnitId: unitGId,
      quantity: 2.5,
    })
    assert.equal(convValid.status, 200)
    assert.equal(convValid.body.data.convertedQuantity, 2500)

    // Invalid cross-dimension conversion: MASS (kg) -> COUNT (pcs) rejected
    const convInvalid = await agentA.post('/api/materials/units/convert', {
      fromUnitId: unitKgId,
      toUnitId: unitPcsId,
      quantity: 10,
    })
    assert.equal(convInvalid.status, 400)
    assert.equal(convInvalid.body.error, 'DIMENSIONAL_MISMATCH')
  })

  await t.test('3. Material Catalog and Configurable Varieties', async () => {
    // Create Material
    const matRes = await agentA.post('/api/materials', {
      name: 'Teff Grain',
      categoryId: categoryAId,
      defaultUnitId: unitKgId,
      minimumStock: 80, // Minimum stock threshold = 80 kg
    })
    assert.equal(matRes.status, 201)
    materialTeffId = matRes.body.data.id

    // Create Varieties
    const var1 = await agentA.post(`/api/materials/${materialTeffId}/varieties`, {
      name: 'Magna',
      description: 'Grade 1 pure white Ada’a teff',
    })
    assert.equal(var1.status, 201)
    varietyMagnaId = var1.body.data.id

    const var2 = await agentA.post(`/api/materials/${materialTeffId}/varieties`, {
      name: 'Sergegna',
      description: 'Mixed white and brown variety',
    })
    assert.equal(var2.status, 201)

    // Verify duplicate variety rejected
    const dupVar = await agentA.post(`/api/materials/${materialTeffId}/varieties`, {
      name: 'Magna',
    })
    assert.equal(dupVar.status, 409)
  })

  await t.test('4. Supplier Directory Management', async () => {
    const supRes = await agentA.post('/api/materials/suppliers', {
      name: "Ada'a Agricultural Farmers Cooperative",
      phone: '+251911223344',
      address: 'Bishoftu / Debre Zeit, Oromia',
      contactPerson: 'Ato Bekele Tadesse',
    })
    assert.equal(supRes.status, 201)
    supplierAId = supRes.body.data.id
  })

  await t.test('5. Usable Weight Calculation & Non-Positive Weight Rejection', async () => {
    // Attempt purchase with non-positive usable weight: Gross 10, Tare 8, Unusable 3 => Net -1
    const invalidNetRes = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supplierAId,
      purchaseNumber: 'PO-INVALID-01',
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 100,
      items: [
        {
          materialId: materialTeffId,
          varietyId: varietyMagnaId,
          unitId: unitKgId,
          grossQuantity: 10,
          tareQuantity: 8,
          unusableQuantity: 3, // Net = -1 kg
          purchaseCost: 2000,
        },
      ],
    })
    assert.ok(invalidNetRes.status === 400 || invalidNetRes.status === 500)

    // Valid purchase calculation:
    // Gross: 110 kg, Tare: 2 kg, Unusable: 3 kg => Usable: 105 kg
    // Purchase amount: 18,000 ETB, Transport overhead: 500 ETB => Total cost: 18,500 ETB
    // Expected unit cost: 18,500 / 105 = 176.1905 ETB/kg
    const validPurchaseRes = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supplierAId,
      purchaseNumber: 'PO-2026-1001',
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 500,
      paymentStatus: 'PAID',
      items: [
        {
          materialId: materialTeffId,
          varietyId: varietyMagnaId,
          unitId: unitKgId,
          grossQuantity: 110,
          tareQuantity: 2,
          unusableQuantity: 3,
          purchaseCost: 18000,
        },
      ],
    })
    assert.equal(validPurchaseRes.status, 201)
    purchaseAId = validPurchaseRes.body.data.id

    const item = validPurchaseRes.body.data.items[0]
    assert.equal(Number(item.usableQuantity), 105)
    assert.equal(Number(item.allocatedAcquisitionCost), 500)
    assert.equal(Number(item.unitCost), 176.1905)
  })

  await t.test('6. Purchase Receipt and Material Lot Generation', async () => {
    const receiveRes = await agentA.post(`/api/materials/purchases/${purchaseAId}/receive`)
    assert.equal(receiveRes.status, 200)
    assert.equal(receiveRes.body.data.createdLots.length, 1)

    const createdLot = receiveRes.body.data.createdLots[0]
    lot1Id = createdLot.id
    assert.equal(Number(createdLot.originalQuantity), 105)
    assert.equal(Number(createdLot.remainingQuantity), 105)
    assert.equal(Number(createdLot.unitCost), 176.1905)
    assert.equal(createdLot.status, 'AVAILABLE')

    // Double receipt rejected
    const repeatReceive = await agentA.post(`/api/materials/purchases/${purchaseAId}/receive`)
    assert.equal(repeatReceive.status, 400)
    assert.equal(repeatReceive.body.error, 'ALREADY_RECEIVED')
  })

  await t.test('7. Lot Distinctness Invariant: Second purchase generates independent lot', async () => {
    // Receive second purchase of the same material: 50 kg at 160 ETB/kg
    const po2Res = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supplierAId,
      purchaseNumber: 'PO-2026-1002',
      purchaseDate: new Date().toISOString(),
      acquisitionCost: 0,
      receiveImmediately: true, // Immediately creates lot
      items: [
        {
          materialId: materialTeffId,
          varietyId: varietyMagnaId,
          unitId: unitKgId,
          grossQuantity: 52,
          tareQuantity: 2,
          unusableQuantity: 0,
          purchaseCost: 8000, // 8000 / 50 = 160 ETB/kg
        },
      ],
    })
    assert.equal(po2Res.status, 201)

    // Retrieve active lots for this material
    const lotsRes = await agentA.get(`/api/materials/lots?materialId=${materialTeffId}`)
    assert.equal(lotsRes.status, 200)
    assert.equal(lotsRes.body.data.length, 2) // Invariant: Two independent lots, NOT merged

    const foundLot2 = lotsRes.body.data.find((l: any) => l.id !== lot1Id)
    assert.ok(foundLot2)
    lot2Id = foundLot2.id
    assert.equal(Number(foundLot2.originalQuantity), 50)
    assert.equal(Number(foundLot2.unitCost), 160)
  })

  await t.test('8. Partial Lot Consumption, Over-consumption Rejection & Depletion Invariant', async () => {
    // Available in Lot 1 is 105 kg. Consume 35 kg for production
    const consumeRes = await agentA.post(`/api/materials/lots/${lot1Id}/adjust`, {
      movementType: 'PRODUCTION_CONSUMPTION',
      quantity: 35,
      reason: 'Batch B-101 dough fermentation',
    })
    assert.equal(consumeRes.status, 200)
    assert.equal(Number(consumeRes.body.data.lot.remainingQuantity), 70)
    assert.equal(consumeRes.body.data.lot.status, 'AVAILABLE')

    // Attempt to consume 80 kg from Lot 1 (which only has 70 kg remaining) -> Over-consumption rejection
    const overConsumeRes = await agentA.post(`/api/materials/lots/${lot1Id}/adjust`, {
      movementType: 'PRODUCTION_CONSUMPTION',
      quantity: 80,
      reason: 'Invalid excessive consumption',
    })
    assert.equal(overConsumeRes.status, 400)
    assert.equal(overConsumeRes.body.error, 'INSUFFICIENT_STOCK')

    // Consume remaining 70 kg -> Transitions status to DEPLETED
    const depleteRes = await agentA.post(`/api/materials/lots/${lot1Id}/adjust`, {
      movementType: 'PRODUCTION_CONSUMPTION',
      quantity: 70,
      reason: 'Batch B-102 dough fermentation',
    })
    assert.equal(depleteRes.status, 200)
    assert.equal(Number(depleteRes.body.data.lot.remainingQuantity), 0)
    assert.equal(depleteRes.body.data.lot.status, 'DEPLETED')

    // Check movements audit trail for Lot 1
    const movementsRes = await agentA.get(`/api/materials/lots/${lot1Id}/movements`)
    assert.equal(movementsRes.status, 200)
    assert.equal(movementsRes.body.data.movements.length, 3) // 1 PURCHASE_RECEIPT + 2 PRODUCTION_CONSUMPTION
  })

  await t.test('9. Low-Stock Alert Invariant Threshold', async () => {
    // Current stock for Teff: Lot 1 is 0 (DEPLETED), Lot 2 is 50.
    // Minimum stock threshold configured on Teff is 80 kg.
    // Therefore, Teff stock (50 kg) <= minimumStock (80 kg) => must trigger low-stock alert!
    const lowStockRes = await agentA.get('/api/materials/low-stock')
    assert.equal(lowStockRes.status, 200)
    assert.equal(lowStockRes.body.summary.totalLowStockCount, 1)
    assert.equal(lowStockRes.body.data[0].id, materialTeffId)
    assert.equal(lowStockRes.body.data[0].currentStock, 50)
    assert.equal(lowStockRes.body.data[0].isLowStock, true)
  })

  await t.test('10. Cross-Tenant Isolation: Tenant B cannot access Tenant A materials & lots', async () => {
    // Tenant B attempts to read Tenant A's material details
    const getMatRes = await agentB.get(`/api/materials/${materialTeffId}`)
    assert.equal(getMatRes.status, 404)

    // Tenant B attempts to adjust Tenant A's material lot
    const adjustRes = await agentB.post(`/api/materials/lots/${lot2Id}/adjust`, {
      movementType: 'ADJUSTMENT_IN',
      quantity: 10,
      reason: 'Cross-tenant illegal adjustment',
    })
    assert.equal(adjustRes.status, 404)

    // Tenant B gets material list - should be empty
    const listRes = await agentB.get('/api/materials')
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.data.length, 0)
  })
})
