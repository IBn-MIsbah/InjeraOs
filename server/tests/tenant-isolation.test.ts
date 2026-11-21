import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Multi-Tenant Isolation Acceptance Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  const emailA = `tenant-a-${Date.now()}@bakery-a.et`
  const emailB = `tenant-b-${Date.now()}@bakery-b.et`
  const password = 'Password123!'

  let businessAId = ''
  let businessBId = ''
  let userAId = ''
  let userBId = ''
  let membershipBId = ''

  t.after(async () => {
    await agentA.close()
    await cleanupTestData([businessAId, businessBId], [userAId, userBId])
  })

  await t.test('1. Setup two independent businesses and owners', async () => {
    // Register Tenant A
    const resA = await agentA.post('/api/auth/register', {
      name: 'Owner Tenant A',
      email: emailA,
      password,
      businessName: 'Bole Injera Hub',
    })
    assert.strictEqual(resA.status, 201)
    businessAId = resA.body.data.business.id
    userAId = resA.body.data.user.id

    // Register Tenant B
    const resB = await agentB.post('/api/auth/register', {
      name: 'Owner Tenant B',
      email: emailB,
      password,
      businessName: 'Kazanchis Special Injera',
    })
    assert.strictEqual(resB.status, 201)
    businessBId = resB.body.data.business.id
    userBId = resB.body.data.user.id
    membershipBId = resB.body.data.membershipId

    assert.notStrictEqual(businessAId, businessBId)
    assert.notStrictEqual(userAId, userBId)
  })

  await t.test('2. Tenant A user listing does NOT leak Tenant B users', async () => {
    const res = await agentA.get('/api/users')
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray(res.body.data))

    const returnedUserIds = res.body.data.map((u: any) => u.id)
    assert.ok(returnedUserIds.includes(userAId), 'Must include Tenant A user')
    assert.ok(!returnedUserIds.includes(userBId), 'Must NOT include Tenant B user')
  })

  await t.test('3. Tenant A direct lookup of Tenant B user returns 404 NOT_FOUND', async () => {
    const res = await agentA.get(`/api/users/${userBId}`)
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.error, 'NOT_FOUND')
  })

  await t.test('4. Tenant A cannot modify Tenant B user (returns 404 NOT_FOUND)', async () => {
    const res = await agentA.patch(`/api/users/${userBId}`, {
      name: 'Attempted Cross-Tenant Takeover',
    })
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.error, 'NOT_FOUND')

    // Confirm Tenant B's data remains untouched
    const verifyUserB = await prisma.user.findUnique({ where: { id: userBId } })
    assert.strictEqual(verifyUserB?.name, 'Owner Tenant B')
  })

  await t.test('5. Tenant A cannot assign or alter Tenant B member role', async () => {
    // Tenant A attempts to alter Tenant B's membership
    const rolesA = await agentA.get('/api/roles')
    assert.strictEqual(rolesA.status, 200)
    const someRoleId = rolesA.body.data[0].id

    const res = await agentA.patch(`/api/roles/members/${membershipBId}`, {
      roleId: someRoleId,
    })
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.error, 'NOT_FOUND')
  })
})
