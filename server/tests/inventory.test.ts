import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 7: Inventory Management and Finished Stock Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  let businessAId = ''
  let businessBId = ''
  let ownerAId = ''
  let ownerBId = ''

  let branchAId = ''
  let employeeAId = ''
  let unitKgId = ''
  let unitPcsId = ''
  let teffMaterialId = ''
  let teffLotAId = ''
  let productAId = ''
  let recipeAId = ''
  let recipeVersion1Id = ''

  let sessionId = ''
  let batchCompletedId = ''
  let batchZeroAcceptedId = ''
  let batchDraftId = ''

  let stockLocation1Id = ''
  let stockLocation2Id = ''
  let finishedLot1Id = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)
    if (businessIds.length > 0) {
      await prisma.finishedStockMovement.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.finishedInventoryLot.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.stockLocation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.productionCostRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.labourAllocation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.labourCostRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.overheadAllocation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.overheadRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.bakerProductionRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.rejectionRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.productionOutput.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialConsumption.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.batchEmployeeAssignment.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.productionBatch.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.productionSession.deleteMany({ where: { businessId: { in: businessIds } } })
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
      await prisma.attendanceRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shiftAssignment.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shift.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employee.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.jobPosition.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
  })

  // 1. Setup Tenant A and Foundational Production Flow
  await t.test('1. Setup Tenant A environment with completed batch & costing', async () => {
    const regRes = await agentA.post('/api/auth/register', {
      name: 'Selam Bakery Owner',
      email: `owner-inv-${Date.now()}@selam.et`,
      password: 'Password123!',
      businessName: 'Selam Injera Inventory Ltd',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regRes.status, 201)
    businessAId = regRes.body.data.business.id
    ownerAId = regRes.body.data.user.id

    // Create Branch
    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Silo & Bakery',
      code: 'SLM-MAIN',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Position & Employee
    const posRes = await agentA.post('/api/workforce/positions', { name: 'Lead Baker' })
    const empRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posRes.body.data.id,
      employeeNumber: 'EMP-INV-01',
      firstName: 'Almaz',
      lastName: 'Kebede',
      employmentType: 'FULL_TIME',
      hireDate: '2026-01-01',
    })
    employeeAId = empRes.body.data.id

    // Units
    const uKg = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(uKg.status, 201)
    unitKgId = uKg.body.data.id

    const uPcs = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(uPcs.status, 201)
    unitPcsId = uPcs.body.data.id

    // Category & Raw Material (Teff) with minimum stock = 50 kg
    const catRes = await agentA.post('/api/materials/categories', { name: 'Grains & Flours' })
    const matRes = await agentA.post('/api/materials', {
      name: 'Magna Teff Flour',
      categoryId: catRes.body.data.id,
      defaultUnitId: unitKgId,
      minimumStock: 50,
    })
    teffMaterialId = matRes.body.data.id

    // Supplier & Purchase
    const supRes = await agentA.post('/api/materials/suppliers', { name: 'Ada Flour Mills' })
    const purRes = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supRes.body.data.id,
      purchaseNumber: 'PO-INV-001',
      purchaseDate: '2026-03-01',
      acquisitionCost: 0,
      paymentStatus: 'PAID',
      receiveImmediately: true,
      items: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          grossQuantity: 200,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 10000, // 50 ETB/kg
        },
      ],
    })
    assert.equal(purRes.status, 201)

    // Retrieve created lot
    const lotsRes = await agentA.get('/api/materials/lots')
    teffLotAId = lotsRes.body.data[0].id

    // Product & Recipe
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Standard 40cm Teff Injera',
      productCode: 'INJ-STD-40',
      size: '40cm',
      unitId: unitPcsId,
      defaultSellingPrice: 25.0,
    })
    productAId = prodRes.body.data.id

    const recipeRes = await agentA.post('/api/recipes', {
      name: 'Classic Teff 40cm',
      productId: productAId,
      branchId: branchAId,
      referenceBatchQuantity: 50,
      expectedYield: 500,
      ingredients: [{ materialId: teffMaterialId, unitId: unitKgId, expectedQuantity: 50 }],
    })
    assert.equal(recipeRes.status, 201)
    recipeAId = recipeRes.body.data.id
    recipeVersion1Id = recipeRes.body.data.currentVersion.id

    // Session
    const sessRes = await agentA.post('/api/production/sessions', {
      branchId: branchAId,
      sessionNumber: 'SESS-INV-01',
      operationalDate: '2026-03-05',
      startTime: '2026-03-05T06:00:00Z',
      supervisorId: employeeAId,
    })
    sessionId = sessRes.body.data.id

    // Create Batch 1: Completed with 450 accepted and 50 rejected units
    const b1Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-INV-COMPLETED',
      plannedQuantity: 500,
      startTime: '2026-03-05T06:30:00Z',
    })
    assert.equal(b1Res.status, 201)
    batchCompletedId = b1Res.body.data.id

    const c1Res = await agentA.post(`/api/production/batches/${batchCompletedId}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 50,
          unitId: unitKgId,
        },
      ],
    })
    assert.equal(c1Res.status, 201)

    const o1Res = await agentA.post(`/api/production/batches/${batchCompletedId}/outputs`, {
      productId: productAId,
      acceptedQuantity: 450,
      rejectedQuantity: 50,
      allocationMethod: 'PRODUCTION_QUANTITY',
    })
    assert.equal(o1Res.status, 201)

    const f1Res = await agentA.post(`/api/production/batches/${batchCompletedId}/finalize`)
    assert.equal(f1Res.status, 200)

    // Calculate costing for Batch 1
    await agentA.post(`/api/costing/batches/${batchCompletedId}/calculate`)
    await agentA.post(`/api/costing/batches/${batchCompletedId}/finalize`)

    // Create Batch 2: Completed with 0 accepted and 100 rejected (total failure)
    const b2Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-INV-ZERO-ACCEPTED',
      plannedQuantity: 100,
      startTime: '2026-03-05T08:00:00Z',
    })
    assert.equal(b2Res.status, 201)
    batchZeroAcceptedId = b2Res.body.data.id

    const c2Res = await agentA.post(`/api/production/batches/${batchZeroAcceptedId}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 10,
          unitId: unitKgId,
        },
      ],
    })
    assert.equal(c2Res.status, 201)

    const o2Res = await agentA.post(`/api/production/batches/${batchZeroAcceptedId}/outputs`, {
      productId: productAId,
      acceptedQuantity: 0,
      rejectedQuantity: 100,
      allocationMethod: 'PRODUCTION_QUANTITY',
    })
    assert.equal(o2Res.status, 201)

    const f2Res = await agentA.post(`/api/production/batches/${batchZeroAcceptedId}/finalize`)
    assert.equal(f2Res.status, 200)

    // Create Batch 3: Still DRAFT
    const b3Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-INV-DRAFT',
      plannedQuantity: 100,
      startTime: '2026-03-05T10:00:00Z',
    })
    assert.equal(b3Res.status, 201)
    batchDraftId = b3Res.body.data.id
  })

  // 2. Stock Locations Management
  await t.test('2. Stock Location creation, listing and duplicate rejection', async () => {
    // Location 1
    const loc1Res = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Main Cooling Rack Room',
      description: 'Primary ventilated cooling racks',
    })
    assert.equal(loc1Res.status, 201)
    stockLocation1Id = loc1Res.body.data.id

    // Location 2
    const loc2Res = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Packaging & Dispatch Area',
      description: 'Packaged dispatch shelves',
    })
    assert.equal(loc2Res.status, 201)
    stockLocation2Id = loc2Res.body.data.id

    // Duplicate name at same branch should return 409
    const dupRes = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Main Cooling Rack Room',
    })
    assert.equal(dupRes.status, 409)
    assert.equal(dupRes.body.error, 'DUPLICATE_LOCATION')

    // List locations
    const listRes = await agentA.get('/api/inventory/locations')
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.data.length >= 2, true)
    assert.equal(listRes.body.data[0].branchName, 'Main Silo & Bakery')
  })

  // 3. Raw Material Stock Valuation & Low Stock Check
  await t.test('3. Raw material stock valuation and minimum stock alert', async () => {
    const rawRes = await agentA.get('/api/inventory/raw-stock')
    assert.equal(rawRes.status, 200)
    const teffSummary = rawRes.body.data.find((m: { materialId: string }) => m.materialId === teffMaterialId)
    assert.ok(teffSummary)

    // Initial purchase: 200kg, Batch 1 consumed: 50kg, Batch 2 consumed: 10kg -> Remaining: 140kg
    assert.equal(teffSummary.totalRemainingQuantity, 140)
    assert.equal(teffSummary.minimumStock, 50)
    assert.equal(teffSummary.isLowStock, false) // 140 > 50
    assert.equal(teffSummary.totalStockValuation, 7000) // 140kg * 50 ETB/kg
  })

  // 4. Raw Material Stock Adjustment (Damage / Spoilage)
  await t.test('4. Raw material adjustment with movement tracking and no-negative invariant', async () => {
    // Attempt reduction greater than remaining: 200kg > 140kg
    const failRes = await agentA.post('/api/inventory/raw-stock/adjust', {
      materialLotId: teffLotAId,
      movementType: 'ADJUSTMENT_OUT',
      quantity: 200,
      notes: 'Water leak damaged grain sacks',
    })
    assert.equal(failRes.status, 400)
    assert.equal(failRes.body.error, 'INSUFFICIENT_STOCK')

    // Valid spoilage reduction of 20kg
    const okRes = await agentA.post('/api/inventory/raw-stock/adjust', {
      materialLotId: teffLotAId,
      movementType: 'ADJUSTMENT_OUT',
      quantity: 20,
      notes: 'Damaged during unloading',
    })
    assert.equal(okRes.status, 200)
    assert.equal(Number(okRes.body.data.remainingQuantity), 120)

    // Verify raw stock valuation updated
    const rawRes = await agentA.get('/api/inventory/raw-stock')
    const teffSummary = rawRes.body.data.find((m: { materialId: string }) => m.materialId === teffMaterialId)
    assert.equal(teffSummary.totalRemainingQuantity, 120)
    assert.equal(teffSummary.totalStockValuation, 6000) // 120kg * 50
  })

  // 5. Production-to-Finished-Stock Posting (Accepted-unit Invariant)
  await t.test('5. Post completed production batch: ONLY accepted units enter sellable stock', async () => {
    const postRes = await agentA.post('/api/inventory/finished-lots/post-production', {
      productionBatchId: batchCompletedId,
      stockLocationId: stockLocation1Id,
      expiryHours: 72,
    })
    assert.equal(postRes.status, 201)
    const lot = postRes.body.data
    finishedLot1Id = lot.id

    // DOMAIN INVARIANT: Batch had 450 accepted and 50 rejected.
    // Original & remaining quantity MUST be exactly 450 (accepted sellable units).
    assert.equal(lot.originalQuantity, 450)
    assert.equal(lot.remainingQuantity, 450)
    assert.equal(lot.status, 'AVAILABLE')
    assert.equal(lot.stockLocationId, stockLocation1Id)
    assert.ok(lot.expiryAt)

    // Unit cost must be inherited from batch calculation
    assert.ok(Number(lot.unitCost) > 0)
  })

  // 6. Duplicate Posting Prevention
  await t.test('6. Duplicate posting of the same batch is prevented', async () => {
    const dupRes = await agentA.post('/api/inventory/finished-lots/post-production', {
      productionBatchId: batchCompletedId,
      stockLocationId: stockLocation1Id,
    })
    assert.equal(dupRes.status, 409)
    assert.equal(dupRes.body.error, 'ALREADY_POSTED')
  })

  // 7. Uncompleted Batch Rejection
  await t.test('7. Posting an uncompleted (DRAFT) batch is rejected', async () => {
    const draftRes = await agentA.post('/api/inventory/finished-lots/post-production', {
      productionBatchId: batchDraftId,
      stockLocationId: stockLocation1Id,
    })
    assert.equal(draftRes.status, 400)
    assert.equal(draftRes.body.error, 'BATCH_NOT_COMPLETED')
  })

  // 8. Zero Accepted Units Invariant (Rejected injera never enters sellable stock)
  await t.test('8. Batch with 0 accepted units cannot enter sellable inventory', async () => {
    const zeroRes = await agentA.post('/api/inventory/finished-lots/post-production', {
      productionBatchId: batchZeroAcceptedId,
      stockLocationId: stockLocation1Id,
    })
    assert.equal(zeroRes.status, 400)
    assert.equal(zeroRes.body.error, 'NO_ACCEPTED_UNITS')
  })

  // 9. FIFO Stock Rotation & Sale-Ready Stock
  await t.test('9. Sale-ready stock returns FIFO rotation sequence and freshness indicators', async () => {
    const saleReadyRes = await agentA.get('/api/inventory/sale-ready')
    assert.equal(saleReadyRes.status, 200)
    assert.equal(saleReadyRes.body.data.length >= 1, true)

    const item = saleReadyRes.body.data[0]
    assert.equal(item.id, finishedLot1Id)
    assert.equal(item.remainingQuantity, 450)
    assert.equal(item.fifoSequence, 1)
    assert.equal(item.isExpired, false)
    assert.equal(item.productName, 'Standard 40cm Teff Injera')
  })

  // 10. Finished Goods Damage & Spoilage Write-Off
  await t.test('10. Finished stock damage/spoilage deduction with no-negative invariant', async () => {
    // Attempt deduction greater than remaining: 500 > 450
    const failRes = await agentA.post('/api/inventory/finished-lots/adjust', {
      finishedInventoryLotId: finishedLot1Id,
      movementType: 'DAMAGE_OUT',
      quantity: 500,
      reason: 'Shelf collapse',
    })
    assert.equal(failRes.status, 400)
    assert.equal(failRes.body.error, 'INSUFFICIENT_STOCK')

    // Valid spoilage deduction of 30 units (e.g. cracked during handling)
    const okRes = await agentA.post('/api/inventory/finished-lots/adjust', {
      finishedInventoryLotId: finishedLot1Id,
      movementType: 'DAMAGE_OUT',
      quantity: 30,
      reason: 'Cracked during handling',
    })
    assert.equal(okRes.status, 200)
    assert.equal(okRes.body.data.remainingQuantity, 420)
    assert.equal(okRes.body.data.status, 'AVAILABLE')
  })

  // 11. Stock Location Transfer (Paired Movements)
  await t.test('11. Stock location transfer deducts source and creates destination lot', async () => {
    // Transfer 100 units from Cooling Rack (Location 1) to Dispatch Area (Location 2)
    const transferRes = await agentA.post('/api/inventory/finished-lots/transfer', {
      sourceLotId: finishedLot1Id,
      targetStockLocationId: stockLocation2Id,
      quantity: 100,
      notes: 'Transfer to dispatch for afternoon retail deliveries',
    })
    assert.equal(transferRes.status, 200)
    const destLot = transferRes.body.data
    assert.equal(destLot.stockLocationId, stockLocation2Id)
    assert.equal(destLot.originalQuantity, 100)
    assert.equal(destLot.remainingQuantity, 100)

    // Verify source lot remaining was reduced: 420 - 100 = 320
    const sourceLotRes = await agentA.get(`/api/inventory/finished-lots`)
    const updatedSource = sourceLotRes.body.data.find((l: { id: string }) => l.id === finishedLot1Id)
    assert.equal(updatedSource.remainingQuantity, 320)
  })

  // 12. Movement-Based Audit Reconciliation
  await t.test('12. Lot movement reconciliation matches calculated balance perfectly', async () => {
    const recRes = await agentA.get(`/api/inventory/finished-lots/${finishedLot1Id}/reconciliation`)
    assert.equal(recRes.status, 200)
    const rec = recRes.body.data

    // Initial production: +450 IN
    // Damage write-off: -30 OUT
    // Transfer out: -100 OUT
    // Expected calculated balance: 450 - 130 = 320
    assert.equal(rec.totalIn, 450)
    assert.equal(rec.totalOut, 130)
    assert.equal(rec.calculatedBalance, 320)
    assert.equal(rec.remainingQuantity, 320)
    assert.equal(rec.reconciles, true)
    assert.equal(rec.movements.length, 3)
  })

  // 13. Cross-Tenant Isolation
  await t.test('13. Cross-Tenant Isolation: Tenant B cannot access Tenant A inventory', async () => {
    const regB = await agentB.post('/api/auth/register', {
      name: 'Tenant B Owner',
      email: `owner-inv-b-${Date.now()}@tenantb.et`,
      password: 'Password123!',
      businessName: 'Tenant B Bakery',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regB.status, 201)
    businessBId = regB.body.data.business.id
    ownerBId = regB.body.data.user.id

    // Tenant B cannot see Tenant A's stock locations
    const locsB = await agentB.get('/api/inventory/locations')
    assert.equal(locsB.status, 200)
    assert.equal(locsB.body.data.length, 0)

    // Tenant B cannot see Tenant A's finished lots
    const lotsB = await agentB.get('/api/inventory/finished-lots')
    assert.equal(lotsB.status, 200)
    assert.equal(lotsB.body.data.length, 0)

    // Tenant B cannot adjust Tenant A's finished lot
    const adjustB = await agentB.post('/api/inventory/finished-lots/adjust', {
      finishedInventoryLotId: finishedLot1Id,
      movementType: 'DAMAGE_OUT',
      quantity: 10,
    })
    assert.equal(adjustB.status, 404)

    // Tenant B cannot access Tenant A lot reconciliation
    const recB = await agentB.get(`/api/inventory/finished-lots/${finishedLot1Id}/reconciliation`)
    assert.equal(recB.status, 404)
  })
})
