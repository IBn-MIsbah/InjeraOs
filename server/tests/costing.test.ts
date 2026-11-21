import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 6: Production Costing and Labour Cost Suite', async (t) => {
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
  let batch1Id = ''
  let batch2Id = ''

  let labourCost1Id = ''
  let sharedOverhead1Id = ''
  let directOverhead1Id = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)
    if (businessIds.length > 0) {
      await prisma.productionCostRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.labourAllocation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.labourCostRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.overheadAllocation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.overheadRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employeeCompensation.deleteMany({ where: { businessId: { in: businessIds } } })
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
      await prisma.materialVariety.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.material.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialCategory.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.unitOfMeasure.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employee.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.jobPosition.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.branch.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
  })

  await t.test('1. Prerequisite Setup: Business, workforce, materials, recipe, and executed batches', async () => {
    // Register Tenant A
    const regResA = await agentA.post('/api/auth/register', {
      email: `owner.cost.a.${Date.now()}@bakery.com`,
      password: 'Password123!',
      name: 'Costing Owner A',
      businessName: 'Addis Costing Bakery A',
    })
    assert.strictEqual(regResA.status, 201)
    businessAId = regResA.body.data.business.id
    ownerAId = regResA.body.data.user.id

    // Create Branch
    const branchRes = await agentA.post('/api/branches', {
      name: 'Central Bakery Plant',
      code: 'CBP-01',
      isMain: true,
    })
    branchAId = branchRes.body.data.id

    // Create Employee
    const posRes = await agentA.post('/api/workforce/positions', {
      name: 'Master Baker',
    })
    const empRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posRes.body.data.id,
      employeeNumber: 'EMP-COST-01',
      firstName: 'Bekele',
      lastName: 'Desta',
      employmentType: 'FULL_TIME',
      hireDate: '2026-01-01',
    })
    employeeAId = empRes.body.data.id

    // Create Units & Material
    const kgRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    unitKgId = kgRes.body.data.id

    const pcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    unitPcsId = pcsRes.body.data.id

    const catRes = await agentA.post('/api/materials/categories', { name: 'Grains' })
    const matRes = await agentA.post('/api/materials', {
      name: 'Teff Flour Premium',
      categoryId: catRes.body.data.id,
      defaultUnitId: unitKgId,
      minimumStock: 50,
    })
    teffMaterialId = matRes.body.data.id

    // Purchase Lot: 100 kg @ 40 ETB/kg = 4000 ETB total cost
    const supRes = await agentA.post('/api/materials/suppliers', { name: 'Grain Wholesale' })
    const poRes = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId: supRes.body.data.id,
      purchaseNumber: 'PO-COST-001',
      purchaseDate: '2026-11-20',
      acquisitionCost: 0,
      paymentStatus: 'PAID',
      receiveImmediately: true,
      items: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          grossQuantity: 100,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 4000,
        },
      ],
    })
    assert.strictEqual(poRes.status, 201)

    const lotRes = await agentA.get('/api/materials/lots')
    teffLotAId = lotRes.body.data[0].id
    assert.strictEqual(Number(lotRes.body.data[0].unitCost), 40)

    // Product & Recipe
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Finest Injera',
      productCode: 'INJ-FINE-01',
      unitId: unitPcsId,
      defaultSellingPrice: 30,
    })
    productAId = prodRes.body.data.id

    const recipeRes = await agentA.post('/api/recipes', {
      name: 'Finest Injera Formulation',
      productId: productAId,
      branchId: branchAId,
      referenceBatchQuantity: 50,
      expectedYield: 100,
      ingredients: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          expectedQuantity: 50,
        },
      ],
    })
    recipeAId = recipeRes.body.data.id
    recipeVersion1Id = recipeRes.body.data.currentVersion.id

    // Production Session & Batches
    const sessRes = await agentA.post('/api/production/sessions', {
      branchId: branchAId,
      sessionNumber: 'SESS-COST-01',
      operationalDate: '2026-11-21',
      startTime: '2026-11-21T06:00:00Z',
      supervisorId: employeeAId,
    })
    sessionId = sessRes.body.data.id

    // Batch 1
    const b1Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-COST-01',
      plannedQuantity: 50,
    })
    batch1Id = b1Res.body.data.id

    // Batch 2
    const b2Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-COST-02',
      plannedQuantity: 50,
    })
    batch2Id = b2Res.body.data.id

    // Consume 50 kg in Batch 1: 50 kg * 40 ETB/kg = 2000 ETB material cost
    const consumeRes = await agentA.post(`/api/production/batches/${batch1Id}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 50,
          unitId: unitKgId,
        },
      ],
    })
    assert.strictEqual(consumeRes.status, 201)

    // Output Batch 1: 90 accepted + 10 rejected = 100 actual output
    const outputRes = await agentA.post(`/api/production/batches/${batch1Id}/outputs`, {
      productId: productAId,
      acceptedQuantity: 90,
      rejectedQuantity: 10,
    })
    assert.strictEqual(outputRes.status, 201)
  })

  await t.test('2. Effective-dated employee compensation record creation & history', async () => {
    const res = await agentA.post('/api/costing/compensations', {
      employeeId: employeeAId,
      compensationType: 'HOURLY',
      rate: 150,
      effectiveFrom: '2026-01-01',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(Number(res.body.data.rate), 150)
    assert.strictEqual(res.body.data.compensationType, 'HOURLY')

    // Fetch compensation history
    const listRes = await agentA.get(`/api/costing/compensations/${employeeAId}`)
    assert.strictEqual(listRes.status, 200)
    assert.strictEqual(listRes.body.data.length, 1)
  })

  await t.test('3. Labour cost record creation with rate snapshot', async () => {
    // 480 minutes (8 hours) @ 150 ETB/hr = 1200 ETB
    const res = await agentA.post('/api/costing/labour-costs', {
      branchId: branchAId,
      employeeId: employeeAId,
      operationalDate: '2026-11-21',
      workedMinutes: 480,
      compensationTypeSnapshot: 'HOURLY',
      rateSnapshot: 150,
      totalLabourCost: 1200,
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(Number(res.body.data.totalLabourCost), 1200)
    assert.strictEqual(res.body.data.status, 'UNALLOCATED')
    labourCost1Id = res.body.data.id
  })

  await t.test('4. Direct & Shared Labour Allocation: Allocate 600 ETB to Batch 1 and 600 ETB to Batch 2', async () => {
    const res = await agentA.post(`/api/costing/labour-costs/${labourCost1Id}/allocate`, {
      allocationMethod: 'PRODUCTION_QUANTITY',
      allocations: [
        {
          productionBatchId: batch1Id,
          allocatedMinutes: 240,
          allocatedAmount: 600,
        },
        {
          productionBatchId: batch2Id,
          allocatedMinutes: 240,
          allocatedAmount: 600,
        },
      ],
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.length, 2)

    // Verify labour cost record status transitioned to ALLOCATED
    const listRes = await agentA.get('/api/costing/labour-costs')
    const item = listRes.body.data.find((l: { id: string }) => l.id === labourCost1Id)
    assert.ok(item)
    assert.strictEqual(item.allocatedAmount, 1200)
    assert.strictEqual(item.unallocatedAmount, 0)
    assert.strictEqual(item.status, 'ALLOCATED')
  })

  await t.test('5. Reject labour allocation exceeding source labour cost record total', async () => {
    const res = await agentA.post(`/api/costing/labour-costs/${labourCost1Id}/allocate`, {
      allocations: [
        {
          productionBatchId: batch1Id,
          allocatedMinutes: 60,
          allocatedAmount: 200,
        },
      ],
    })

    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.error, 'EXCEEDS_LABOUR_COST')
  })

  await t.test('6. Direct batch overhead creation (e.g. Firewood/Gas for Batch 1)', async () => {
    const res = await agentA.post('/api/costing/overheads', {
      branchId: branchAId,
      productionBatchId: batch1Id,
      operationalDate: '2026-11-21',
      category: 'FIREWOOD',
      amount: 450,
      allocationType: 'DIRECT_BATCH',
      description: 'Acacia firewood bundle consumed for Batch 1',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(Number(res.body.data.amount), 450)
    assert.strictEqual(res.body.data.allocationType, 'DIRECT_BATCH')
    directOverhead1Id = res.body.data.id
  })

  await t.test('7. Daily shared overhead creation (e.g. Water & Electricity for day)', async () => {
    const res = await agentA.post('/api/costing/overheads', {
      branchId: branchAId,
      operationalDate: '2026-11-21',
      category: 'ELECTRICITY',
      amount: 500,
      allocationType: 'DAILY_SHARED',
      description: 'Daily generator & electric mitad power overhead',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(Number(res.body.data.amount), 500)
    assert.strictEqual(res.body.data.allocationType, 'DAILY_SHARED')
    sharedOverhead1Id = res.body.data.id
  })

  await t.test('8. Shared daily overhead allocation across batches (50% to Batch 1, 50% to Batch 2)', async () => {
    const res = await agentA.post(`/api/costing/overheads/${sharedOverhead1Id}/allocate`, {
      allocationMethod: 'PRODUCTION_QUANTITY',
      allocations: [
        {
          productionBatchId: batch1Id,
          allocationPercentage: 50,
          allocatedAmount: 250,
        },
        {
          productionBatchId: batch2Id,
          allocationPercentage: 50,
          allocatedAmount: 250,
        },
      ],
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.length, 2)

    // Check overhead listings reflect full allocation
    const listRes = await agentA.get('/api/costing/overheads')
    const item = listRes.body.data.find((o: { id: string }) => o.id === sharedOverhead1Id)
    assert.ok(item)
    assert.strictEqual(item.allocatedAmount, 500)
    assert.strictEqual(item.unallocatedAmount, 0)
    assert.strictEqual(item.isFullyAllocated, true)
  })

  await t.test('9. Reject shared overhead allocation exceeding original overhead amount', async () => {
    const res = await agentA.post(`/api/costing/overheads/${sharedOverhead1Id}/allocate`, {
      allocations: [
        {
          productionBatchId: batch1Id,
          allocationPercentage: 20,
          allocatedAmount: 100,
        },
      ],
    })

    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.error, 'EXCEEDS_OVERHEAD_AMOUNT')
  })

  await t.test('10. Batch Cost Calculation & Absorption Invariant', async () => {
    // Cost breakdown for Batch 1:
    // Material Cost: 50 kg * 40 ETB/kg = 2000 ETB
    // Direct Overhead: 450 ETB (Firewood)
    // Allocated Daily Overhead: 250 ETB (Electricity)
    // Allocated Labour Cost: 600 ETB
    // Total Batch Cost: 2000 + 450 + 250 + 600 = 3300 ETB
    // Output: 90 accepted sellable units (10 rejected)
    // Cost per accepted unit: 3300 / 90 = 36.6667 ETB / injera
    const res = await agentA.post(`/api/costing/batches/${batch1Id}/calculate`, {})
    assert.strictEqual(res.status, 201)
    const cost = res.body.data

    assert.strictEqual(Number(cost.materialCost), 2000)
    assert.strictEqual(Number(cost.directOverheadCost), 450)
    assert.strictEqual(Number(cost.allocatedDailyOverhead), 250)
    assert.strictEqual(Number(cost.allocatedLabourCost), 600)
    assert.strictEqual(Number(cost.totalBatchCost), 3300)
    assert.strictEqual(cost.acceptedQuantity, 90)
    assert.strictEqual(Number(cost.costPerAcceptedUnit), 36.6667)
    assert.strictEqual(cost.calculationVersion, 1)
  })

  await t.test('11. Finalize batch costing (locks snapshot immutably and updates labour status)', async () => {
    const res = await agentA.post(`/api/costing/batches/${batch1Id}/finalize`, {})
    assert.strictEqual(res.status, 200)
    assert.ok(res.body.data.finalizedAt)

    // Cannot re-finalize
    const reFinRes = await agentA.post(`/api/costing/batches/${batch1Id}/finalize`, {})
    assert.strictEqual(reFinRes.status, 400)
    assert.strictEqual(reFinRes.body.error, 'ALREADY_FINALIZED')

    // Labour cost status updated to FINALIZED
    const labourRes = await agentA.get('/api/costing/labour-costs')
    const item = labourRes.body.data.find((l: { id: string }) => l.id === labourCost1Id)
    assert.strictEqual(item.status, 'FINALIZED')
  })

  await t.test('12. Immutable Historical Cost Snapshot: Wage rate change does not alter finalized batch cost', async () => {
    // Increase employee compensation wage rate from 150 to 250 ETB/hr
    const wageBumpRes = await agentA.post('/api/costing/compensations', {
      employeeId: employeeAId,
      compensationType: 'HOURLY',
      rate: 250,
      effectiveFrom: '2026-12-01',
    })
    assert.strictEqual(wageBumpRes.status, 201)

    // Verify finalized Batch 1 cost record remains strictly unchanged
    const batchCostRes = await agentA.get(`/api/costing/batches/${batch1Id}`)
    assert.strictEqual(batchCostRes.status, 200)
    const latest = batchCostRes.body.data.latestCostRecord

    assert.strictEqual(Number(latest.totalBatchCost), 3300)
    assert.strictEqual(Number(latest.allocatedLabourCost), 600)
    assert.strictEqual(Number(latest.costPerAcceptedUnit), 36.6667)
  })

  await t.test('13. Unit Cost Trends Report returns finalized batch costing', async () => {
    const res = await agentA.get('/api/costing/reports/unit-cost-trends')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.length, 1)
    const item = res.body.data[0]
    assert.strictEqual(item.batchNumber, 'BATCH-COST-01')
    assert.strictEqual(item.costPerAcceptedUnit, 36.6667)
  })

  await t.test('14. Cross-Tenant Isolation: Tenant B cannot access Tenant A costing, overhead, or labour records', async () => {
    const regResB = await agentB.post('/api/auth/register', {
      email: `owner.cost.b.${Date.now()}@bakery.com`,
      password: 'Password123!',
      name: 'Costing Owner B',
      businessName: 'Bole Costing Bakery B',
    })
    assert.strictEqual(regResB.status, 201)
    businessBId = regResB.body.data.business.id
    ownerBId = regResB.body.data.user.id

    // Tenant B attempting to access Tenant A overhead
    const getOverheadRes = await agentB.get('/api/costing/overheads')
    assert.strictEqual(getOverheadRes.body.data.length, 0)

    // Tenant B attempting to allocate Tenant A overhead
    const allocOverheadRes = await agentB.post(`/api/costing/overheads/${sharedOverhead1Id}/allocate`, {
      allocations: [
        {
          productionBatchId: batch1Id,
          allocationPercentage: 50,
          allocatedAmount: 100,
        },
      ],
    })
    assert.strictEqual(allocOverheadRes.status, 404)

    // Tenant B attempting to access Tenant A labour cost
    const getLabourRes = await agentB.get('/api/costing/labour-costs')
    assert.strictEqual(getLabourRes.body.data.length, 0)

    // Tenant B attempting to finalize Tenant A batch cost
    const finalizeRes = await agentB.post(`/api/costing/batches/${batch1Id}/finalize`, {})
    assert.strictEqual(finalizeRes.status, 404)
  })
})
