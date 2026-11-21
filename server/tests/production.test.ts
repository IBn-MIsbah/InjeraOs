import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 5: Production Sessions and Batches Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  let businessAId = ''
  let businessBId = ''
  let ownerAId = ''
  let ownerBId = ''

  let branchAId = ''
  let supervisorAId = ''
  let bakerAId = ''
  let unitKgId = ''
  let unitPcsId = ''
  let teffMaterialId = ''
  let teffLotAId = ''
  let productAId = ''
  let recipeAId = ''
  let recipeVersion1Id = ''
  let recipeVersion2Id = ''

  let sessionId = ''
  let batch1Id = ''
  let batch2Id = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)
    if (businessIds.length > 0) {
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
      await prisma.attendanceRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shiftAssignment.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shift.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employee.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.jobPosition.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.branch.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
  })

  await t.test('1. Setup prerequisite business, workforce, materials, lots, and recipe versions', async () => {
    // Register Tenant A
    const regResA = await agentA.post('/api/auth/register', {
      email: `owner.prod.a.${Date.now()}@bakery.com`,
      password: 'Password123!',
      name: 'Production Owner A',
      businessName: 'Addis Production A',
    })
    assert.strictEqual(regResA.status, 201)
    businessAId = regResA.body.data.business.id
    ownerAId = regResA.body.data.user.id

    // Create Branch
    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Bakery Floor',
      code: 'MBF-01',
      isMain: true,
    })
    assert.strictEqual(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Create Supervisor and Baker Employees
    const posRes = await agentA.post('/api/workforce/positions', {
      name: 'Lead Baker',
      description: 'Production Lead',
    })
    const posId = posRes.body.data.id

    const supRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posId,
      employeeNumber: 'EMP-SUP-01',
      firstName: 'Almaz',
      lastName: 'Kebede',
      employmentType: 'FULL_TIME',
      hireDate: '2026-01-01',
    })
    supervisorAId = supRes.body.data.id

    const bakerRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posId,
      employeeNumber: 'EMP-BAK-01',
      firstName: 'Tirhas',
      lastName: 'Gidey',
      employmentType: 'FULL_TIME',
      hireDate: '2026-01-01',
    })
    bakerAId = bakerRes.body.data.id

    // Create Units & Category
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

    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Grain & Flours',
    })
    const catId = catRes.body.data.id

    // Create Material & Supplier & Purchase Lot
    const matRes = await agentA.post('/api/materials', {
      name: 'White Teff Grain',
      categoryId: catId,
      defaultUnitId: unitKgId,
      minimumStock: 100,
    })
    teffMaterialId = matRes.body.data.id

    const supItemRes = await agentA.post('/api/materials/suppliers', {
      name: 'Bojibar Grain Supply',
    })
    const supplierId = supItemRes.body.data.id

    const poRes = await agentA.post('/api/materials/purchases', {
      branchId: branchAId,
      supplierId,
      purchaseNumber: 'PO-PROD-001',
      purchaseDate: '2026-11-20',
      acquisitionCost: 1500,
      paymentStatus: 'PAID',
      receiveImmediately: true,
      items: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          grossQuantity: 500,
          tareQuantity: 10,
          unusableQuantity: 10,
          purchaseCost: 35000,
        },
      ],
    })
    assert.strictEqual(poRes.status, 201)

    // Retrieve created lot
    const lotsRes = await agentA.get('/api/materials/lots')
    teffLotAId = lotsRes.body.data[0].id
    assert.strictEqual(Number(lotsRes.body.data[0].remainingQuantity), 480)

    // Create Finished Product
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Standard White Injera',
      productCode: 'INJ-WHT-001',
      size: '40cm',
      unitId: unitPcsId,
      defaultSellingPrice: 25,
    })
    productAId = prodRes.body.data.id

    // Create Recipe Version 1
    const recipeRes = await agentA.post('/api/recipes', {
      name: 'Classic White Injera Recipe',
      productId: productAId,
      branchId: branchAId,
      referenceBatchQuantity: 100,
      expectedYield: 200,
      ingredients: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          expectedQuantity: 80,
        },
      ],
    })
    assert.strictEqual(recipeRes.status, 201)
    recipeAId = recipeRes.body.data.id
    recipeVersion1Id = recipeRes.body.data.currentVersion.id

    // Bump Recipe to Version 2
    const v2Res = await agentA.post(`/api/recipes/${recipeAId}/versions`, {
      referenceBatchQuantity: 150,
      expectedYield: 300,
      instructions: 'Version 2 with optimized hydration ratio',
      ingredients: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          expectedQuantity: 120,
        },
      ],
    })
    assert.strictEqual(v2Res.status, 201)
    recipeVersion2Id = v2Res.body.data.id
  })

  await t.test('2. POST /api/production/sessions creates production session', async () => {
    const res = await agentA.post('/api/production/sessions', {
      branchId: branchAId,
      sessionNumber: 'SESS-202611-001',
      operationalDate: '2026-11-21',
      startTime: '2026-11-21T06:00:00Z',
      supervisorId: supervisorAId,
      notes: 'Morning high-capacity baking shift',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.sessionNumber, 'SESS-202611-001')
    assert.strictEqual(res.body.data.status, 'DRAFT')
    sessionId = res.body.data.id
  })

  await t.test('3. Duplicate session number within same business rejected with 409 CONFLICT', async () => {
    const res = await agentA.post('/api/production/sessions', {
      branchId: branchAId,
      sessionNumber: 'SESS-202611-001',
      operationalDate: '2026-11-21',
      startTime: '2026-11-21T06:00:00Z',
      supervisorId: supervisorAId,
    })

    assert.strictEqual(res.status, 409)
    assert.strictEqual(res.body.error, 'CONFLICT')
  })

  await t.test('4. Multiple batches in one session using different recipe versions & variable planned sizes', async () => {
    // Batch 1 using Recipe Version 1 (Ref 100 kg, planned 100 kg)
    const b1Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-202611-01',
      plannedQuantity: 100,
      startTime: '2026-11-21T06:30:00Z',
    })
    assert.strictEqual(b1Res.status, 201)
    assert.strictEqual(b1Res.body.data.batchNumber, 'BATCH-202611-01')
    assert.strictEqual(b1Res.body.data.status, 'DRAFT')
    batch1Id = b1Res.body.data.id

    // Batch 2 using Recipe Version 2 (Ref 150 kg, planned 150 kg)
    const b2Res = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion2Id,
      batchNumber: 'BATCH-202611-02',
      plannedQuantity: 150,
      startTime: '2026-11-21T09:30:00Z',
    })
    assert.strictEqual(b2Res.status, 201)
    assert.strictEqual(b2Res.body.data.batchNumber, 'BATCH-202611-02')
    batch2Id = b2Res.body.data.id
  })

  await t.test('5. Employee assignments to production batch', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/assignments`, {
      employeeId: bakerAId,
      assignmentRole: 'BAKER',
      assignedStart: '2026-11-21T06:30:00Z',
      notes: 'Assigned to Mitad Station 1-4',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.assignmentRole, 'BAKER')
  })

  await t.test('6. Material Consumption: Rejects consumption exceeding lot stock balance', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 9999, // Available is only 480
          unitId: unitKgId,
        },
      ],
    })

    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.error, 'INSUFFICIENT_LOT_STOCK')
  })

  await t.test('7. Material Consumption: Consumes exact lot, deducts stock, and creates movement record', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 80,
          unitId: unitKgId,
        },
      ],
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.length, 1)

    // Verify lot remaining quantity decremented from 480 to 400
    const lotRes = await agentA.get(`/api/materials/lots/${teffLotAId}/movements`)
    assert.strictEqual(lotRes.status, 200)
    assert.strictEqual(Number(lotRes.body.data.lot.remainingQuantity), 400)

    const movements = lotRes.body.data.movements
    const consumptionMovement = movements.find(
      (m: { movementType: string; referenceId: string }) =>
        m.movementType === 'PRODUCTION_CONSUMPTION' && m.referenceId === batch1Id
    )
    assert.ok(consumptionMovement)
    assert.strictEqual(Number(consumptionMovement.quantity), 80)
  })

  await t.test('8. Rejection mismatch validation: Detailed rejections sum must match rejectedQuantity', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/outputs`, {
      productId: productAId,
      acceptedQuantity: 190,
      rejectedQuantity: 10,
      rejections: [
        {
          reason: 'BURNT',
          quantity: 4,
        },
        {
          reason: 'TORN_DAMAGED',
          quantity: 4, // 4 + 4 = 8 != 10
        },
      ],
    })

    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.error, 'REJECTION_SUM_MISMATCH')
  })

  await t.test('9. Product Outputs & Detailed Rejections: Mass reconciliation (actual = accepted + rejected)', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/outputs`, {
      productId: productAId,
      acceptedQuantity: 190,
      rejectedQuantity: 10,
      rejections: [
        {
          reason: 'BURNT',
          quantity: 6,
          employeeId: bakerAId,
          notes: 'Overheated electric mitad surface',
        },
        {
          reason: 'TORN_DAMAGED',
          quantity: 4,
          employeeId: bakerAId,
          notes: 'Damaged during peeling',
        },
      ],
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.output.totalQuantity, 200)
    assert.strictEqual(res.body.data.output.acceptedQuantity, 190)
    assert.strictEqual(res.body.data.output.rejectedQuantity, 10)
    assert.strictEqual(res.body.data.rejections.length, 2)
  })

  await t.test('10. Baker Output Attribution: Reconciles with team output without exceeding', async () => {
    // Attempt to attribute 250 accepted when batch only accepted 190
    const failRes = await agentA.post(`/api/production/batches/${batch1Id}/bakers`, {
      employeeId: bakerAId,
      productId: productAId,
      acceptedQuantity: 250,
      rejectedQuantity: 5,
      attributionMethod: 'INDIVIDUAL_COUNT',
    })

    assert.strictEqual(failRes.status, 400)
    assert.strictEqual(failRes.body.error, 'EXCEEDS_TEAM_OUTPUT')

    // Valid baker attribution: 180 accepted, 10 rejected (leaving 10 unallocated)
    const validRes = await agentA.post(`/api/production/batches/${batch1Id}/bakers`, {
      employeeId: bakerAId,
      productId: productAId,
      acceptedQuantity: 180,
      rejectedQuantity: 10,
      attributionMethod: 'INDIVIDUAL_COUNT',
      notes: 'Morning shift counter reading',
    })

    assert.strictEqual(validRes.status, 201)
    assert.strictEqual(validRes.body.data.totalProduced, 190)
  })

  await t.test('11. Output & Baker Reconciliation Report invariant', async () => {
    const res = await agentA.get(`/api/production/reports/reconciliations?batchId=${batch1Id}`)
    assert.strictEqual(res.status, 200)
    const data = res.body.data

    assert.strictEqual(data.teamOutput.accepted, 190)
    assert.strictEqual(data.teamOutput.rejected, 10)
    assert.strictEqual(data.teamOutput.total, 200)

    assert.strictEqual(data.bakerAttributed.accepted, 180)
    assert.strictEqual(data.bakerAttributed.rejected, 10)

    // Unallocated reconciliation: 190 - 180 = 10
    assert.strictEqual(data.unallocated.accepted, 10)
    assert.strictEqual(data.unallocated.rejected, 0)
    assert.strictEqual(data.isReconciled, true)
  })

  await t.test('12. Baker Productivity Report distinguishes total output from accepted sellable output', async () => {
    const res = await agentA.get('/api/production/reports/baker-productivity')
    assert.strictEqual(res.status, 200)
    const data = res.body.data

    const baker = data.find((b: { employeeId: string }) => b.employeeId === bakerAId)
    assert.ok(baker)
    assert.strictEqual(baker.totalProduced, 190)
    assert.strictEqual(baker.acceptedQuantity, 180)
    assert.strictEqual(baker.rejectedQuantity, 10)
    assert.strictEqual(baker.rejectionRatePercentage, 5.26)
  })

  await t.test('13. Finalization Invariant: Reconciles output, locks batch, and prevents further mutations', async () => {
    const res = await agentA.post(`/api/production/batches/${batch1Id}/finalize`, {})
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.status, 'COMPLETED')
    assert.ok(res.body.data.finalizedAt)

    // Attempting to consume materials on completed batch must be rejected
    const mutateRes = await agentA.post(`/api/production/batches/${batch1Id}/consume`, {
      consumptions: [
        {
          materialLotId: teffLotAId,
          actualQuantity: 10,
          unitId: unitKgId,
        },
      ],
    })

    assert.strictEqual(mutateRes.status, 400)
    assert.strictEqual(mutateRes.body.error, 'IMMUTABLE_BATCH')
  })

  await t.test('14. Cross-Tenant Isolation: Tenant B cannot access Tenant A production sessions or batches', async () => {
    const regResB = await agentB.post('/api/auth/register', {
      email: `owner.prod.b.${Date.now()}@bakery.com`,
      password: 'Password123!',
      name: 'Production Owner B',
      businessName: 'Bole Production B',
    })
    assert.strictEqual(regResB.status, 201)
    businessBId = regResB.body.data.business.id
    ownerBId = regResB.body.data.user.id

    // Tenant B attempting to read Tenant A session
    const getSessRes = await agentB.get(`/api/production/sessions/${sessionId}`)
    assert.strictEqual(getSessRes.status, 404)

    // Tenant B attempting to read Tenant A batch
    const getBatchRes = await agentB.get(`/api/production/batches/${batch1Id}`)
    assert.strictEqual(getBatchRes.status, 404)

    // Tenant B attempting to finalize Tenant A batch
    const finalizeRes = await agentB.post(`/api/production/batches/${batch1Id}/finalize`, {})
    assert.strictEqual(finalizeRes.status, 404)

    // Tenant B session listing only returns Tenant B data
    const listRes = await agentB.get('/api/production/sessions')
    assert.strictEqual(listRes.status, 200)
    assert.strictEqual(listRes.body.data.length, 0)
  })
})
