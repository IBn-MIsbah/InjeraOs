import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent } from './test-helper.js'

test('Milestone 8: Sales, Customers, Credit Ledger & Distribution Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  t.after(async () => {
    await agentA.close()
  })

  // Tenant A IDs
  let businessAId: string
  let ownerAId: string
  let branchAId: string
  let employeeDriverId: string
  let unitKgId: string
  let unitPcsId: string
  let teffMaterialId: string
  let teffLotAId: string
  let productAId: string
  let recipeAId: string
  let recipeVersion1Id: string
  let sessionId: string
  let batchId: string
  let stockLocation1Id: string
  let finishedLot1Id: string

  // Milestone 8 Sales IDs
  let customer1Id: string // Lucy Restaurant (credit limit 5000)
  let customer2Id: string // Habesha Grocery (credit limit 2000)
  let cashSaleId: string
  let creditSaleId: string
  let deliveryId: string

  // 1. Setup Tenant A environment with finished goods inventory
  await t.test('1. Setup Tenant A environment with sellable finished inventory', async () => {
    const regRes = await agentA.post('/api/auth/register', {
      name: 'Tenant A Sales Owner',
      email: `owner-sales-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      businessName: 'Addis Fresh Injera Co',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regRes.status, 201)
    businessAId = regRes.body.data.business.id
    ownerAId = regRes.body.data.user.id

    // Branch
    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Silo & Bakery Hub',
      code: 'HUB-01',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Employee (Driver)
    const posRes = await agentA.post('/api/workforce/positions', {
      name: 'Delivery Driver',
    })
    assert.equal(posRes.status, 201)

    const empRes = await agentA.post('/api/workforce/employees', {
      branchId: branchAId,
      positionId: posRes.body.data.id,
      firstName: 'Almaz',
      lastName: 'Kebede',
      employeeNumber: 'DRV-001',
      hireDate: '2026-01-01',
      status: 'ACTIVE',
    })
    assert.equal(empRes.status, 201)
    employeeDriverId = empRes.body.data.id

    // Units
    const uKgRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.equal(uKgRes.status, 201)
    unitKgId = uKgRes.body.data.id

    const uPcsRes = await agentA.post('/api/materials/units', {
      name: 'Piece',
      symbol: 'pcs',
      dimension: 'COUNT',
      isBaseUnit: true,
    })
    assert.equal(uPcsRes.status, 201)
    unitPcsId = uPcsRes.body.data.id

    // Category & Material
    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Grains & Flours',
    })
    assert.equal(catRes.status, 201)

    const matRes = await agentA.post('/api/materials', {
      categoryId: catRes.body.data.id,
      name: 'Magna Teff Grain',
      defaultUnitId: unitKgId,
      minimumStock: 50,
    })
    assert.equal(matRes.status, 201)
    teffMaterialId = matRes.body.data.id

    // Supplier & Purchase 200kg @ 50 ETB/kg = 10,000 ETB
    const suppRes = await agentA.post('/api/materials/suppliers', {
      name: 'Ada Teff Farmers Union',
    })
    assert.equal(suppRes.status, 201)

    const purchRes = await agentA.post('/api/materials/purchases', {
      supplierId: suppRes.body.data.id,
      branchId: branchAId,
      purchaseNumber: 'PUR-SALES-01',
      purchaseDate: '2026-03-01T10:00:00Z',
      acquisitionCost: 10000,
      paymentStatus: 'PAID',
      receiveImmediately: true,
      items: [
        {
          materialId: teffMaterialId,
          unitId: unitKgId,
          grossQuantity: 200,
          tareQuantity: 0,
          unusableQuantity: 0,
          purchaseCost: 10000,
        },
      ],
    })
    assert.equal(purchRes.status, 201)

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
    assert.equal(prodRes.status, 201)
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

    // Production Session & Batch
    const sessRes = await agentA.post('/api/production/sessions', {
      branchId: branchAId,
      sessionNumber: 'SESS-SALES-01',
      operationalDate: '2026-03-05',
      startTime: '2026-03-05T06:00:00Z',
      supervisorId: employeeDriverId,
    })
    assert.equal(sessRes.status, 201)
    sessionId = sessRes.body.data.id

    const bRes = await agentA.post('/api/production/batches', {
      productionSessionId: sessionId,
      recipeId: recipeAId,
      recipeVersionId: recipeVersion1Id,
      batchNumber: 'BATCH-FOR-SALES',
      plannedQuantity: 500,
      startTime: '2026-03-05T06:30:00Z',
    })
    assert.equal(bRes.status, 201)
    batchId = bRes.body.data.id

    // Consume 50kg Teff
    await agentA.post(`/api/production/batches/${batchId}/consume`, {
      consumptions: [{ materialLotId: teffLotAId, actualQuantity: 50, unitId: unitKgId }],
    })

    // Output: 450 accepted, 50 rejected
    await agentA.post(`/api/production/batches/${batchId}/outputs`, {
      productId: productAId,
      acceptedQuantity: 450,
      rejectedQuantity: 50,
      allocationMethod: 'PRODUCTION_QUANTITY',
    })

    await agentA.post(`/api/production/batches/${batchId}/finalize`)

    // Costing calculation & finalization
    await agentA.post(`/api/costing/batches/${batchId}/calculate`)
    await agentA.post(`/api/costing/batches/${batchId}/finalize`)

    // Stock Location
    const locRes = await agentA.post('/api/inventory/locations', {
      branchId: branchAId,
      name: 'Main Finished Goods Rack',
    })
    assert.equal(locRes.status, 201)
    stockLocation1Id = locRes.body.data.id

    // Post Batch to Finished Goods Inventory: 450 accepted sellable units
    const postRes = await agentA.post('/api/inventory/finished-lots/post-production', {
      productionBatchId: batchId,
      stockLocationId: stockLocation1Id,
      expiryHours: 72,
    })
    assert.equal(postRes.status, 201)
    finishedLot1Id = postRes.body.data.id
    assert.equal(postRes.body.data.remainingQuantity, 450)
  })

  // 2. Customer Management & Profiles
  await t.test('2. Customer registration, credit limit configuration and listing', async () => {
    // Customer 1: Restaurant with 5000 ETB credit limit
    const c1Res = await agentA.post('/api/sales/customers', {
      name: 'Lucy Traditional Restaurant',
      phone: '+251911223344',
      address: 'Bole Medhanealem, Addis Ababa',
      customerType: 'RESTAURANT',
      creditLimit: 5000,
    })
    assert.equal(c1Res.status, 201)
    assert.equal(c1Res.body.data.name, 'Lucy Traditional Restaurant')
    assert.equal(c1Res.body.data.creditLimit, 5000)
    assert.equal(c1Res.body.data.derivedBalance, 0)
    customer1Id = c1Res.body.data.id

    // Customer 2: Grocery shop with 2000 ETB credit limit
    const c2Res = await agentA.post('/api/sales/customers', {
      name: 'Habesha Neighbourhood Grocery',
      phone: '+251922334455',
      address: 'Piazza, Addis Ababa',
      customerType: 'GROCERY_SHOP',
      creditLimit: 2000,
    })
    assert.equal(c2Res.status, 201)
    assert.equal(c2Res.body.data.creditLimit, 2000)
    customer2Id = c2Res.body.data.id

    // List customers
    const listRes = await agentA.get('/api/sales/customers')
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.data.length, 2)
  })

  // 3. Cash Sale with Automatic FIFO Finished Stock Allocation
  await t.test('3. Cash POS sale consumes finished stock via FIFO and creates allocations & movements', async () => {
    // Sale of 100 pcs @ 25 ETB/pc = 2500 ETB paid in full with CASH
    const saleRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      saleNumber: 'INV-2026-001',
      items: [
        {
          productId: productAId,
          quantity: 100,
          unitPrice: 25.0,
        },
      ],
      payment: {
        amount: 2500,
        paymentMethod: 'CASH',
        referenceNumber: 'CASH-REC-001',
      },
    })
    assert.equal(saleRes.status, 201)
    const sale = saleRes.body.data
    cashSaleId = sale.id

    assert.equal(sale.totalAmount, 2500)
    assert.equal(sale.paymentStatus, 'PAID')
    assert.equal(sale.saleStatus, 'COMPLETED')
    assert.ok(sale.payment)

    // Verify finished stock decreased from 450 to 350 pcs
    const lotsRes = await agentA.get('/api/inventory/finished-lots')
    const lot = lotsRes.body.data.find((l: { id: string }) => l.id === finishedLot1Id)
    assert.equal(lot.remainingQuantity, 350)

    // Verify sale detail with COGS and allocations
    const detailRes = await agentA.get(`/api/sales/${cashSaleId}`)
    assert.equal(detailRes.status, 200)
    assert.equal(detailRes.body.data.items.length, 1)
    assert.equal(detailRes.body.data.items[0].allocations.length, 1)
    assert.equal(detailRes.body.data.items[0].allocations[0].finishedInventoryLotId, finishedLot1Id)
    assert.equal(detailRes.body.data.items[0].allocations[0].quantity, 100)
    assert.ok(detailRes.body.data.totalCOGS > 0)
    assert.ok(detailRes.body.data.grossProfit > 0)
  })

  // 4. Credit Sale to Registered Customer & Append-Only Ledger Entry
  await t.test('4. Partial credit sale creates append-only customer ledger entries and updates derived balance', async () => {
    // Sale of 150 pcs @ 25 ETB = 3750 ETB to Lucy Restaurant
    // Customer pays 750 ETB upfront via Mobile Money, remaining unpaid = 3000 ETB
    const saleRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      customerId: customer1Id,
      saleNumber: 'INV-2026-002',
      items: [
        {
          productId: productAId,
          quantity: 150,
          unitPrice: 25.0,
        },
      ],
      payment: {
        amount: 750,
        paymentMethod: 'MOBILE_MONEY',
        referenceNumber: 'CBE-BIRR-98721',
      },
    })
    assert.equal(saleRes.status, 201)
    const sale = saleRes.body.data
    creditSaleId = sale.id

    assert.equal(sale.totalAmount, 3750)
    assert.equal(sale.paymentStatus, 'PARTIAL')

    // Finished stock decreased: 350 - 150 = 200 pcs
    const lotsRes = await agentA.get('/api/inventory/finished-lots')
    const lot = lotsRes.body.data.find((l: { id: string }) => l.id === finishedLot1Id)
    assert.equal(lot.remainingQuantity, 200)

    // Customer profile derived balance: +3750 (Sale) - 750 (Payment) = 3000 ETB
    const custRes = await agentA.get(`/api/sales/customers/${customer1Id}`)
    assert.equal(custRes.status, 200)
    assert.equal(custRes.body.data.derivedBalance, 3000)
    assert.equal(custRes.body.data.isOverCreditLimit, false) // 3000 < 5000
  })

  // 5. Credit Limit Enforcement Invariant
  await t.test('5. Credit limit invariant: unpaid sale exceeding credit limit is strictly rejected', async () => {
    // Customer 2 (Habesha Grocery) has credit limit = 2000 ETB
    // Attempt sale of 100 pcs @ 25 ETB = 2500 ETB with 0 upfront payment
    // Projected balance 2500 > 2000 -> must return 400 CREDIT_LIMIT_EXCEEDED
    const failRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      customerId: customer2Id,
      saleNumber: 'INV-FAIL-LIMIT',
      items: [
        {
          productId: productAId,
          quantity: 100,
          unitPrice: 25.0,
        },
      ],
    })
    assert.equal(failRes.status, 400)
    assert.equal(failRes.body.error, 'CREDIT_LIMIT_EXCEEDED')

    // Invariant: stock was NOT deducted
    const lotsRes = await agentA.get('/api/inventory/finished-lots')
    const lot = lotsRes.body.data.find((l: { id: string }) => l.id === finishedLot1Id)
    assert.equal(lot.remainingQuantity, 200)
  })

  // 6. Debt Repayment via Customer Ledger
  await t.test('6. Record debt repayment crediting customer account and updating derived balance', async () => {
    // Customer 1 pays 2000 ETB bank transfer towards their outstanding debt
    const payRes = await agentA.post('/api/sales/payments', {
      customerId: customer1Id,
      saleId: creditSaleId,
      amount: 2000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'AWASH-TRF-55443',
    })
    assert.equal(payRes.status, 201)

    // Customer derived balance: 3000 - 2000 = 1000 ETB
    const custRes = await agentA.get(`/api/sales/customers/${customer1Id}`)
    assert.equal(custRes.body.data.derivedBalance, 1000)

    // Sale payment status updated: 750 + 2000 = 2750 / 3750 (still PARTIAL)
    const saleRes = await agentA.get(`/api/sales/${creditSaleId}`)
    assert.equal(saleRes.body.data.paymentStatus, 'PARTIAL')
  })

  // 7. Customer Statement with Running Balances
  await t.test('7. Customer ledger statement computes accurate chronological running balances', async () => {
    const stmtRes = await agentA.get(`/api/sales/customers/${customer1Id}/statement`)
    assert.equal(stmtRes.status, 200)
    const { customer, entries } = stmtRes.body.data

    assert.equal(customer.currentBalance, 1000)
    assert.equal(entries.length, 3)

    // Entry 1: Sale of 3750 ETB
    assert.equal(entries[0].transactionType, 'SALE')
    assert.equal(entries[0].debit, 3750)
    assert.equal(entries[0].credit, 0)
    assert.equal(entries[0].runningBalance, 3750)

    // Entry 2: Upfront payment of 750 ETB
    assert.equal(entries[1].transactionType, 'PAYMENT')
    assert.equal(entries[1].debit, 0)
    assert.equal(entries[1].credit, 750)
    assert.equal(entries[1].runningBalance, 3000)

    // Entry 3: Bank transfer repayment of 2000 ETB
    assert.equal(entries[2].transactionType, 'PAYMENT')
    assert.equal(entries[2].debit, 0)
    assert.equal(entries[2].credit, 2000)
    assert.equal(entries[2].runningBalance, 1000)
  })

  // 8. Auditable Ledger Adjustment
  await t.test('8. Auditable ledger adjustment modifies balance transparently without overwriting history', async () => {
    // Owner issues 200 ETB promotional credit adjustment
    const adjRes = await agentA.post(`/api/sales/customers/${customer1Id}/ledger-adjustment`, {
      direction: 'CREDIT',
      amount: 200,
      description: 'Promotional loyalty voucher credit for Ramadan launch',
    })
    assert.equal(adjRes.status, 201)
    assert.equal(adjRes.body.data.newDerivedBalance, 800)

    // Verify statement now has 4 entries
    const stmtRes = await agentA.get(`/api/sales/customers/${customer1Id}/statement`)
    assert.equal(stmtRes.body.data.entries.length, 4)
    assert.equal(stmtRes.body.data.customer.currentBalance, 800)
  })

  // 9. Delivery Route Scheduling & Distribution
  await t.test('9. Schedule delivery, track status progression, and confirm delivered quantities', async () => {
    // Schedule delivery for Customer 1
    const delivRes = await agentA.post('/api/sales/deliveries', {
      branchId: branchAId,
      customerId: customer1Id,
      saleId: creditSaleId,
      deliveryEmployeeId: employeeDriverId,
      deliveryDate: '2026-03-05T14:00:00Z',
      notes: 'Deliver to back kitchen door before 3 PM lunch service',
      items: [
        {
          productId: productAId,
          quantity: 150,
        },
      ],
    })
    assert.equal(delivRes.status, 201)
    deliveryId = delivRes.body.data.id
    assert.equal(delivRes.body.data.status, 'PENDING')

    // Driver sets delivery to IN_TRANSIT
    const transitRes = await agentA.patch(`/api/sales/deliveries/${deliveryId}/status`, {
      status: 'IN_TRANSIT',
      notes: 'Driver on route with delivery van',
    })
    assert.equal(transitRes.status, 200)
    assert.equal(transitRes.body.data.status, 'IN_TRANSIT')

    // Driver confirms DELIVERED with delivered quantity
    const detailRes = await agentA.get(`/api/sales/deliveries/${deliveryId}`)
    const deliveryItemId = detailRes.body.data.items[0].id

    const deliveredRes = await agentA.patch(`/api/sales/deliveries/${deliveryId}/status`, {
      status: 'DELIVERED',
      notes: 'Received and signed by head chef',
      items: [
        {
          deliveryItemId,
          deliveredQuantity: 150,
        },
      ],
    })
    assert.equal(deliveredRes.status, 200)
    assert.equal(deliveredRes.body.data.status, 'DELIVERED')
  })

  // 10. Sale Cancellation with Inventory & Ledger Reversal
  await t.test('10. Sale cancellation restores inventory and records ledger reversal', async () => {
    // Create a 20 pcs sale to walk-in customer (paid cash 500 ETB)
    const saleRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      saleNumber: 'INV-TO-CANCEL',
      items: [
        {
          productId: productAId,
          quantity: 20,
          unitPrice: 25.0,
        },
      ],
      payment: {
        amount: 500,
        paymentMethod: 'CASH',
      },
    })
    assert.equal(saleRes.status, 201)
    const cancelSaleId = saleRes.body.data.id

    // Stock was 200, now 180
    const lotBefore = (await agentA.get('/api/inventory/finished-lots')).body.data.find(
      (l: { id: string }) => l.id === finishedLot1Id
    )
    assert.equal(lotBefore.remainingQuantity, 180)

    // Cancel sale
    const cancelRes = await agentA.post(`/api/sales/${cancelSaleId}/cancel`)
    assert.equal(cancelRes.status, 200)

    // Stock must be restored: 180 + 20 = 200
    const lotAfter = (await agentA.get('/api/inventory/finished-lots')).body.data.find(
      (l: { id: string }) => l.id === finishedLot1Id
    )
    assert.equal(lotAfter.remainingQuantity, 200)

    // Attempting to cancel again returns 400
    const dupCancel = await agentA.post(`/api/sales/${cancelSaleId}/cancel`)
    assert.equal(dupCancel.status, 400)
    assert.equal(dupCancel.body.error, 'ALREADY_CANCELLED')
  })

  // 11. Insufficient Stock Prevention
  await t.test('11. Sale exceeding available sellable inventory is rejected', async () => {
    // Current stock is 200 pcs. Attempt sale of 500 pcs
    const failRes = await agentA.post('/api/sales', {
      branchId: branchAId,
      saleNumber: 'INV-OUT-OF-STOCK',
      items: [
        {
          productId: productAId,
          quantity: 500,
          unitPrice: 25.0,
        },
      ],
    })
    assert.equal(failRes.status, 400)
    assert.equal(failRes.body.error, 'INSUFFICIENT_FINISHED_STOCK')
  })

  // 12. Cross-Tenant Isolation
  await t.test('12. Cross-Tenant Isolation: Tenant B cannot access Tenant A sales, customers or ledger', async () => {
    const regB = await agentB.post('/api/auth/register', {
      name: 'Tenant B Owner',
      email: `owner-sales-b-${Date.now()}@tenantb.et`,
      password: 'Password123!',
      businessName: 'Tenant B Bakery',
      currency: 'ETB',
      timezone: 'Africa/Addis_Ababa',
    })
    assert.equal(regB.status, 201)

    // Tenant B cannot see Tenant A's customers
    const custsB = await agentB.get('/api/sales/customers')
    assert.equal(custsB.status, 200)
    assert.equal(custsB.body.data.length, 0)

    // Tenant B cannot see Tenant A's customer statement
    const stmtB = await agentB.get(`/api/sales/customers/${customer1Id}/statement`)
    assert.equal(stmtB.status, 404)

    // Tenant B cannot see Tenant A's sales
    const salesB = await agentB.get('/api/sales')
    assert.equal(salesB.status, 200)
    assert.equal(salesB.body.data.length, 0)

    // Tenant B cannot cancel Tenant A's sale
    const cancelB = await agentB.post(`/api/sales/${creditSaleId}/cancel`)
    assert.equal(cancelB.status, 404)

    // Tenant B cannot view Tenant A's delivery
    const delivB = await agentB.get(`/api/sales/deliveries/${deliveryId}`)
    assert.equal(delivB.status, 404)
  })
})
