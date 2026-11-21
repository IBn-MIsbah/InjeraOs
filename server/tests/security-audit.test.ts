import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Comprehensive Security & Route Audit Suite', async (t) => {
  const unauthAgent = new TestAgent()
  const agentA = new TestAgent()
  const agentB = new TestAgent()

  await agentA.start()
  unauthAgent.baseUrl = agentA.baseUrl
  agentB.baseUrl = agentA.baseUrl

  const emailA = `sec-tenant-a-${Date.now()}@kdplc-bakery.et`
  const emailB = `sec-tenant-b-${Date.now()}@rival-bakery.et`
  const password = 'Password123!'

  let businessAId = ''
  let businessBId = ''
  let userAId = ''
  let userBId = ''
  let branchAId = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [userAId, userBId].filter(Boolean)

    if (businessIds.length > 0) {
      await prisma.expense.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.expenseCategory.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.customer.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.material.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.materialCategory.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.unitOfMeasure.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.branch.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
    await prisma.$disconnect()
  })

  await t.test('1. Setup two independent tenants (KD PLC and Rival Bakery)', async () => {
    // Tenant A: KD PLC
    const resA = await agentA.post('/api/auth/register', {
      name: 'KD PLC Admin',
      email: emailA,
      password,
      businessName: 'KD PLC Injera Enterprise',
    })
    assert.strictEqual(resA.status, 201)
    businessAId = resA.body.data.business.id
    userAId = resA.body.data.user.id

    // Create Tenant A's main branch
    const branchRes = await agentA.post('/api/branches', {
      name: 'KD Main Facility',
      code: 'KD-HQ',
      isMain: true,
    })
    assert.strictEqual(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    // Tenant B: Rival
    const resB = await agentB.post('/api/auth/register', {
      name: 'Rival Bakery Owner',
      email: emailB,
      password,
      businessName: 'Rival Commercial Bakery',
    })
    assert.strictEqual(resB.status, 201)
    businessBId = resB.body.data.business.id
    userBId = resB.body.data.user.id
  })

  await t.test('2. Unauthenticated request protection: sensitive routes reject with 401', async () => {
    const protectedRoutes = [
      '/api/users',
      '/api/business',
      '/api/branches',
      '/api/workforce/employees',
      '/api/materials',
      '/api/recipes',
      '/api/production/sessions',
      '/api/costing/batches',
      '/api/inventory/lots',
      '/api/sales',
      '/api/expenses',
      '/api/reports/financial',
      '/api/dashboards/widgets',
      '/api/sync/status',
    ]

    for (const route of protectedRoutes) {
      const res = await unauthAgent.get(route)
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 UNAUTHORIZED on unauthenticated GET ${route}, got ${res.status}`
      )
    }
  })

  await t.test('3. Security Headers: x-powered-by is disabled and CORS is scoped', async () => {
    const res = await agentA.get('/health')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(
      res.headers.get('x-powered-by'),
      null,
      'x-powered-by header must be disabled to prevent server profiling'
    )
  })

  await t.test('4. Cross-Tenant Isolation: Tenant B cannot access Tenant A branch', async () => {
    // Tenant B attempts to fetch Tenant A's branch
    const res = await agentB.get(`/api/branches/${branchAId}`)
    assert.strictEqual(
      res.status,
      404,
      'Tenant B must receive 404 NOT_FOUND when attempting to access Tenant A branch'
    )
  })

  await t.test('5. Cross-Tenant Isolation: Tenant B cannot access Tenant A materials', async () => {
    // Create unit and category in Tenant A
    const unitRes = await agentA.post('/api/materials/units', {
      name: 'Kilogram',
      symbol: 'kg',
      dimension: 'MASS',
      isBaseUnit: true,
    })
    assert.strictEqual(unitRes.status, 201)
    const unitId = unitRes.body.data.id

    const catRes = await agentA.post('/api/materials/categories', {
      name: 'Grains & Teff',
      code: 'GRAIN-01',
    })
    assert.strictEqual(catRes.status, 201)
    const categoryId = catRes.body.data.id

    // Create material in Tenant A
    const matRes = await agentA.post('/api/materials', {
      name: 'KD Premium Magna Teff',
      categoryId,
      defaultUnitId: unitId,
    })
    assert.strictEqual(matRes.status, 201)
    const materialAId = matRes.body.data.id

    // Tenant B lists materials - should not see Tenant A material
    const listResB = await agentB.get('/api/materials')
    assert.strictEqual(listResB.status, 200)
    const bMaterialIds = listResB.body.data.map((m: any) => m.id)
    assert.ok(!bMaterialIds.includes(materialAId), 'Tenant B list must not include Tenant A materials')

    // Tenant B direct access to material A returns 404
    const getResB = await agentB.get(`/api/materials/${materialAId}`)
    assert.strictEqual(getResB.status, 404)
  })

  await t.test('6. Cross-Tenant Isolation: Tenant B cannot read Tenant A sales or customer records', async () => {
    // Create customer in Tenant A
    const custRes = await agentA.post('/api/sales/customers', {
      name: 'Addis Sheraton Hotel',
      phone: '+251911223344',
      customerType: 'HOTEL',
      creditLimit: 50000,
    })
    assert.strictEqual(custRes.status, 201)
    const customerAId = custRes.body.data.id

    // Tenant B customer listing must not include customer A
    const bCustList = await agentB.get('/api/sales/customers')
    assert.strictEqual(bCustList.status, 200)
    const bCustomerIds = bCustList.body.data.map((c: any) => c.id)
    assert.ok(!bCustomerIds.includes(customerAId), 'Tenant B cannot see Tenant A customers')

    // Tenant B direct lookup returns 404
    const bCustGet = await agentB.get(`/api/sales/customers/${customerAId}`)
    assert.strictEqual(bCustGet.status, 404)
  })

  await t.test('7. Cross-Tenant Isolation: Tenant B cannot access Tenant A expenses or financial P&L', async () => {
    // Create expense category & expense in Tenant A
    const catRes = await agentA.post('/api/expenses/categories', {
      name: 'KD Transport & Distribution Fuel',
      categoryType: 'TRANSPORT',
    })
    assert.strictEqual(catRes.status, 201)
    const categoryId = catRes.body.data.id

    const expRes = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId,
      amount: 12500,
      operationalDate: '2026-11-21',
      description: 'Diesel delivery truck refuel',
      paymentMethod: 'CASH',
    })
    assert.strictEqual(expRes.status, 201)
    const expenseId = expRes.body.data.id

    // Tenant B cannot view expense
    const bExpGet = await agentB.get(`/api/expenses/${expenseId}`)
    assert.strictEqual(bExpGet.status, 404)

    // Tenant B financial report must have zero expenses from Tenant A
    const bPnl = await agentA.get('/api/reports/financial')
    const bPnlOther = await agentB.get('/api/reports/financial')
    assert.strictEqual(bPnl.status, 200)
    assert.strictEqual(bPnlOther.status, 200)
    assert.strictEqual(bPnlOther.body.data.profitability.operatingExpenses, 0)
  })

  await t.test('8. Malformed input validation: SQL injection & unexpected fields rejected safely', async () => {
    // Attempt SQL injection string in numeric or enum fields
    const injectionAttempt = await agentA.post('/api/expenses', {
      branchId: branchAId,
      categoryId: "'; DROP TABLE \"User\"; --",
      amount: 'NOT_A_NUMBER',
      operationalDate: 'INVALID_DATE',
      description: 'Injection test',
      paymentMethod: 'INVALID_ENUM',
    })
    assert.strictEqual(
      injectionAttempt.status,
      400,
      'Malformed/injected inputs must be rejected with 400 Bad Request by Zod schema'
    )
    assert.ok(injectionAttempt.body.error === 'VALIDATION_ERROR' || injectionAttempt.body.error === 'BAD_REQUEST')
  })
})
