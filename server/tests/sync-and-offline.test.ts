import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { TestAgent } from './test-helper.js'
import { prisma } from '../src/lib/prisma.js'

test('Milestone 10: Offline PWA, Idempotent Sync & Stock Conflict Resolution Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  t.after(async () => {
    await agentA.close()
  })

  // Tenant A IDs
  let businessAId: string
  let branchAId: string
  let employeeAId: string
  let supplierAId: string
  let materialAId: string
  let categoryAId: string
  let productAId: string
  let stockLocationAId: string
  let unitKgId: string
  let unitPcsId: string

  // Device IDs
  const device1Id = crypto.randomUUID()
  const device2Id = crypto.randomUUID()

  // Tracked operation & conflict IDs
  let clockInKey: string
  let expenseKey: string
  let purchaseKey: string
  let sale1Key: string
  let conflictSaleKey: string
  let conflictId: string

  // Tenant B IDs
  let businessBId: string

  // 1. Setup Tenant A
  await t.test('1. Setup Tenant A workspace and baseline inventory/workforce fixtures', async () => {
    const regRes = await agentA.post('/api/auth/register', {
      name: 'Tenant A Offline Owner',
      email: `owner-sync-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      businessName: 'Addis Offline PWA Bakery',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regRes.status, 201)
    businessAId = regRes.body.data.business.id

    const branchRes = await agentA.post('/api/branches', {
      name: 'Merkato Offline Station',
      code: 'MK-OFF',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Units
    const unitKgRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: `kg${Date.now().toString().slice(-4)}`,
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(unitKgRes.status, 201)
    unitKgId = unitKgRes.body.data.id

    const unitPcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: `pcs${Date.now().toString().slice(-4)}`,
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(unitPcsRes.status, 201)
    unitPcsId = unitPcsRes.body.data.id

    // Material Category & Material
    const matCatRes = await agentA.post('/api/materials/categories', {
      name: 'Raw Teff Flours',
    })
    assert.equal(matCatRes.status, 201)

    const matRes = await agentA.post('/api/materials', {
      categoryId: matCatRes.body.data.id,
      name: 'Sync White Teff',
      defaultUnitId: unitKgId,
      minimumStock: 10,
    })
    assert.equal(matRes.status, 201)
    materialAId = matRes.body.data.id

    // Supplier
    const supRes = await agentA.post('/api/materials/suppliers', {
      name: 'Gojjam Grain Wholesalers',
      phone: '0911223344',
    })
    assert.equal(supRes.status, 201)
    supplierAId = supRes.body.data.id

    // Expense Category
    const catRes = await agentA.post('/api/expenses/categories', {
      name: 'Bakery Fuel & Logistics',
      categoryType: 'OPERATING',
    })
    assert.equal(catRes.status, 201)
    categoryAId = catRes.body.data.id

    // Product
    const prodRes = await agentA.post('/api/recipes/products', {
      name: 'Classic Offline Injera',
      productCode: `OFF-INJ-${Date.now().toString().slice(-4)}`,
      unitId: unitPcsId,
      defaultSellingPrice: 20.0,
    })
    assert.equal(prodRes.status, 201)
    productAId = prodRes.body.data.id

    // Stock Location
    const locRes = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Front Counter Display',
    })
    assert.equal(locRes.status, 201)
    stockLocationAId = locRes.body.data.id

    // Position & Employee
    const posRes = await agentA.post('/api/workforce/positions', {
      name: 'Head Baker',
    })
    assert.equal(posRes.status, 201)

    const empRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posRes.body.data.id,
      firstName: 'Bekele',
      lastName: 'Desta',
      employeeNumber: `EMP-OFF-${Date.now().toString().slice(-4)}`,
      hireDate: '2026-01-01',
      compensation: {
        compensationType: 'HOURLY',
        rate: 65.0,
      },
    })
    assert.equal(empRes.status, 201)
    employeeAId = empRes.body.data.id
  })

  // 2. Batch Synchronization
  await t.test('2. Batch sync of multiple offline operations (attendance, expense, purchase)', async () => {
    clockInKey = `IDEM-CLOCK-${Date.now()}`
    expenseKey = `IDEM-EXP-${Date.now()}`
    purchaseKey = `IDEM-PUR-${Date.now()}`

    const now = new Date().toISOString()

    const syncPayload = {
      deviceId: device1Id,
      operations: [
        {
          deviceId: device1Id,
          idempotencyKey: clockInKey,
          operationType: 'ATTENDANCE_CLOCK_IN',
          schemaVersion: 1,
          clientTimestamp: now,
          operationalDate: now.slice(0, 10),
          payload: {
            employeeId: employeeAId,
            branchId: branchAId,
            notes: 'Clocked in via offline tablet',
          },
        },
        {
          deviceId: device1Id,
          idempotencyKey: expenseKey,
          operationType: 'EXPENSE_RECORD',
          schemaVersion: 1,
          clientTimestamp: now,
          operationalDate: now.slice(0, 10),
          payload: {
            categoryId: categoryAId,
            branchId: branchAId,
            amount: 450.0,
            paymentMethod: 'CASH',
            description: 'Firewood bundle delivery',
            referenceNumber: 'EXP-OFF-101',
          },
        },
        {
          deviceId: device1Id,
          idempotencyKey: purchaseKey,
          operationType: 'PURCHASE_CREATE',
          schemaVersion: 1,
          clientTimestamp: now,
          operationalDate: now.slice(0, 10),
          payload: {
            supplierId: supplierAId,
            branchId: branchAId,
            invoiceNumber: 'INV-OFF-550',
            items: [
              {
                materialId: materialAId,
                quantity: 100,
                unitCost: 75.0,
                purchaseCost: 7500.0,
              },
            ],
          },
        },
      ],
    }

    const res = await agentA.post('/api/sync/batch', syncPayload)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.total, 3)
    assert.equal(res.body.data.processed, 3)
    assert.equal(res.body.data.conflicts, 0)
    assert.equal(res.body.data.failed, 0)

    // Verify material lot was created with remainingQuantity of 100
    const lot = await prisma.materialLot.findFirst({
      where: { businessId: businessAId, materialId: materialAId },
    })
    assert.equal(Number(lot?.remainingQuantity), 100)
    const auditLogs = await prisma.auditLog.findMany({
      where: { businessId: businessAId, source: 'OFFLINE_SYNC' },
    })
    assert.ok(auditLogs.length >= 3)
  })

  // 3. Idempotency & Duplicate Prevention
  await t.test('3. Idempotency test: Re-submitting identical operations returns existing results without duplication', async () => {
    const now = new Date().toISOString()
    const duplicatePayload = {
      deviceId: device1Id,
      operations: [
        {
          deviceId: device1Id,
          idempotencyKey: clockInKey,
          operationType: 'ATTENDANCE_CLOCK_IN',
          schemaVersion: 1,
          clientTimestamp: now,
          payload: {
            employeeId: employeeAId,
            branchId: branchAId,
          },
        },
        {
          deviceId: device1Id,
          idempotencyKey: purchaseKey,
          operationType: 'PURCHASE_CREATE',
          schemaVersion: 1,
          clientTimestamp: now,
          payload: {
            supplierId: supplierAId,
            branchId: branchAId,
            items: [
              {
                materialId: materialAId,
                quantity: 100,
                unitCost: 75.0,
              },
            ],
          },
        },
      ],
    }

    const res = await agentA.post('/api/sync/batch', duplicatePayload)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.total, 2)
    assert.equal(res.body.data.processed, 2)

    // Verify results indicate idempotent replay
    assert.equal(res.body.data.results[0].idempotent, true)
    assert.equal(res.body.data.results[1].idempotent, true)

    // Verify lots count was NOT duplicated (still exactly 1 lot created)
    const lots = await prisma.materialLot.findMany({ where: { businessId: businessAId, materialId: materialAId } })
    assert.equal(lots.length, 1)
  })

  // 4. Concurrent Stock Conflict Detection
  await t.test('4. Concurrent offline stock conflict detection: Second device sale exceeding remaining stock is flagged as CONFLICT', async () => {
    // Seed exactly 10 units of finished inventory
    const dummyBatchId = crypto.randomUUID()
    const dummyOutputId = crypto.randomUUID()

    const lotRes = await prisma.finishedInventoryLot.create({
      data: {
        businessId: businessAId,
        branchId: branchAId,
        productId: productAId,
        productionBatchId: dummyBatchId,
        productionOutputId: dummyOutputId,
        stockLocationId: stockLocationAId,
        originalQuantity: 10,
        remainingQuantity: 10,
        unitCost: 12.0,
        productionDate: new Date(),
        status: 'AVAILABLE',
      },
    })
    assert.ok(lotRes.id)

    sale1Key = `IDEM-SALE1-${Date.now()}`
    conflictSaleKey = `IDEM-SALE2-CONFLICT-${Date.now()}`
    const now = new Date().toISOString()

    // Device 1 synchronizes a sale of 8 units (Leaves 2 units in stock)
    const dev1Sale = await agentA.post('/api/sync/batch', {
      deviceId: device1Id,
      operations: [
        {
          deviceId: device1Id,
          idempotencyKey: sale1Key,
          operationType: 'SALES_ORDER_CREATE',
          schemaVersion: 1,
          clientTimestamp: now,
          payload: {
            branchId: branchAId,
            items: [{ productId: productAId, quantity: 8, unitPrice: 20.0 }],
            amountPaid: 160.0,
            paymentMethod: 'CASH',
          },
        },
      ],
    })
    assert.equal(dev1Sale.status, 200)
    assert.equal(dev1Sale.body.data.processed, 1)

    // Verify authoritative stock is now 2
    const lotAfterDev1 = await prisma.finishedInventoryLot.findUnique({ where: { id: lotRes.id } })
    assert.equal(lotAfterDev1?.remainingQuantity, 2)

    // Device 2 was offline and recorded a sale of 5 units (5 > 2 remaining)
    const dev2Sale = await agentA.post('/api/sync/batch', {
      deviceId: device2Id,
      operations: [
        {
          deviceId: device2Id,
          idempotencyKey: conflictSaleKey,
          operationType: 'SALES_ORDER_CREATE',
          schemaVersion: 1,
          clientTimestamp: now,
          payload: {
            branchId: branchAId,
            items: [{ productId: productAId, quantity: 5, unitPrice: 20.0 }],
            amountPaid: 100.0,
            paymentMethod: 'CASH',
          },
        },
      ],
    })

    assert.equal(dev2Sale.status, 200)
    assert.equal(dev2Sale.body.data.conflicts, 1)
    assert.equal(dev2Sale.body.data.processed, 0)
    assert.equal(dev2Sale.body.data.results[0].status, 'CONFLICT')
    assert.ok(dev2Sale.body.data.results[0].conflictId)
    conflictId = dev2Sale.body.data.results[0].conflictId

    // Crucial Invariant: Authoritative stock must NOT become negative (-3). It must remain 2!
    const lotAfterDev2 = await prisma.finishedInventoryLot.findUnique({ where: { id: lotRes.id } })
    assert.equal(lotAfterDev2?.remainingQuantity, 2)

    // Verify open conflict in database
    const openConflict = await prisma.syncConflict.findUnique({ where: { id: conflictId } })
    assert.equal(openConflict?.status, 'OPEN')
    assert.equal(openConflict?.conflictType, 'INSUFFICIENT_STOCK')
  })

  // 5. Conflict Resolution Workflow
  await t.test('5. Authorized conflict resolution workflow (DISCARD and RESOLVE strategies)', async () => {
    // Query open conflicts
    const conflictsList = await agentA.get('/api/sync/conflicts?status=OPEN')
    assert.equal(conflictsList.status, 200)
    assert.ok(conflictsList.body.data.length >= 1)
    assert.equal(conflictsList.body.data[0].id, conflictId)

    // Resolve conflict with strategy DISCARD (sets status to REJECTED)
    const resolveRes = await agentA.post(`/api/sync/conflicts/${conflictId}/resolve`, {
      strategy: 'DISCARD',
      resolutionNotes: 'Order cancelled due to stock depletion on other station',
    })
    assert.equal(resolveRes.status, 200)
    assert.equal(resolveRes.body.data.status, 'REJECTED')

    // Verify conflict status in database
    const resolvedConflict = await prisma.syncConflict.findUnique({ where: { id: conflictId } })
    assert.equal(resolvedConflict?.status, 'REJECTED')

    // Verify the underlying sync operation is marked FAILED
    const op = await prisma.syncOperation.findUnique({ where: { id: resolvedConflict!.syncOperationId } })
    assert.equal(op?.syncStatus, 'FAILED')
  })

  // 6. Cross-Tenant Isolation
  await t.test('6. Cross-tenant isolation: Tenant B cannot access Tenant A sync operations or conflicts', async () => {
    const regResB = await agentB.post('/api/auth/register', {
      name: 'Tenant B Sync Owner',
      email: `owner-sync-b-${Date.now()}@bakery.et`,
      password: 'Password123!',
      businessName: 'Hawassa Rival Offline Bakery',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regResB.status, 201)
    businessBId = regResB.body.data.business.id

    // Tenant B attempts to resolve Tenant A's conflict -> 400 Conflict not found or unauthorized
    const illegalResolve = await agentB.post(`/api/sync/conflicts/${conflictId}/resolve`, {
      strategy: 'OVERWRITE',
    })
    assert.equal(illegalResolve.status, 400)

    // Tenant B queries conflicts -> receives empty list
    const tenantBConflicts = await agentB.get('/api/sync/conflicts?status=REJECTED')
    assert.equal(tenantBConflicts.status, 200)
    assert.equal(tenantBConflicts.body.data.length, 0)
  })
})
