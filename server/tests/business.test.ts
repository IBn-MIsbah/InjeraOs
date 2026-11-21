import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Business, Branches & Team Members Suite', async (t) => {
  const agent = new TestAgent()
  await agent.start()

  const ownerEmail = `bakery-biz-${Date.now()}@sheger.et`
  let businessId = ''
  let ownerUserId = ''
  let invitedUserId = ''
  let createdBranchId = ''

  t.after(async () => {
    await agent.close()
    const userIds = [ownerUserId, invitedUserId].filter(Boolean)
    const businessIds = [businessId].filter(Boolean)
    await cleanupTestData(businessIds, userIds)
    await prisma.$disconnect()
  })

  await t.test('1. Owner registers and fetches business profile', async () => {
    const regRes = await agent.post('/api/auth/register', {
      email: ownerEmail,
      password: 'BakeryPassword123!',
      name: 'Business Owner Test',
      businessName: 'Addis Sheger Bakery',
    })

    assert.equal(regRes.status, 201)
    businessId = regRes.body.data.business.id
    ownerUserId = regRes.body.data.user.id

    const res = await agent.get('/api/business')
    assert.equal(res.status, 200)
    assert.equal(res.body.data.name, 'Addis Sheger Bakery')
    assert.equal(res.body.data.currency, 'ETB')
  })

  await t.test('2. PATCH /api/business updates business details and calendar preference', async () => {
    const res = await agent.patch('/api/business', {
      legalName: 'Addis Sheger Bakery PLC',
      phone: '+251911000111',
      dateCalendar: 'ETHIOPIAN',
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.legalName, 'Addis Sheger Bakery PLC')
    assert.equal(res.body.data.phone, '+251911000111')
    assert.equal(res.body.data.dateCalendar, 'ETHIOPIAN')
  })

  await t.test('3. POST /api/branches creates a new bakery branch', async () => {
    const res = await agent.post('/api/branches', {
      name: 'Bole Medhanialem Station',
      code: 'BOLE-01',
      phone: '+251911223344',
      address: 'Near Medhanialem Mall, Bole',
      isMain: true,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.name, 'Bole Medhanialem Station')
    assert.equal(res.body.data.code, 'BOLE-01')
    assert.equal(res.body.data.isMain, true)
    createdBranchId = res.body.data.id
  })

  await t.test('4. POST /api/branches rejects duplicate branch code in same business', async () => {
    const res = await agent.post('/api/branches', {
      name: 'Duplicate Bole Station',
      code: 'BOLE-01',
      isMain: false,
    })
    assert.equal(res.status, 409)
  })

  await t.test('5. GET /api/branches lists all branches for business', async () => {
    const res = await agent.get('/api/branches')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.some((b: any) => b.code === 'BOLE-01'))
  })

  await t.test('6. POST /api/business/members/invite invites a new staff member with branch scoping', async () => {
    const rolesRes = await agent.get('/api/roles')
    assert.equal(rolesRes.status, 200)
    const staffRole = rolesRes.body.data.find((r: any) => r.name === 'BAKER') ?? rolesRes.body.data[0]

    const inviteEmail = `baker.${Date.now()}@sheger.et`
    const res = await agent.post('/api/business/members/invite', {
      name: 'Abebe Baker',
      email: inviteEmail,
      roleId: staffRole.id,
      branchIds: [createdBranchId],
    })

    assert.equal(res.status, 201)
    assert.equal(res.body.data.email, inviteEmail)
    assert.equal(res.body.data.roleId, staffRole.id)
    assert.deepEqual(res.body.data.branchIds, [createdBranchId])
    invitedUserId = res.body.data.userId
  })

  await t.test('7. GET /api/business/members lists team members', async () => {
    const res = await agent.get('/api/business/members')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.length >= 2)
  })
})
