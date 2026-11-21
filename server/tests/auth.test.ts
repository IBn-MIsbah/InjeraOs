import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData } from './test-helper.js'

test('Auth & Session Lifecycle Suite', async (t) => {
  const agent = new TestAgent()
  await agent.start()

  const testEmail = `baker-${Date.now()}@testinjera.et`
  const testPassword = 'Password123!'
  let businessId = ''
  let userId = ''
  let sessionId = ''

  t.after(async () => {
    await agent.close()
    await cleanupTestData([businessId], [userId])
  })

  await t.test('1. User Registration provisions workspace & cookies', async () => {
    const res = await agent.post('/api/auth/register', {
      name: 'Abebe Bikila',
      email: testEmail,
      password: testPassword,
      phone: '+251911223344',
      businessName: 'Bole Injera Hub',
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.user.email, testEmail)
    assert.strictEqual(res.body.data.business.name, 'Bole Injera Hub')
    assert.strictEqual(res.body.data.role, 'OWNER')
    assert.deepStrictEqual(res.body.data.permissions, ['*'])

    userId = res.body.data.user.id
    businessId = res.body.data.business.id

    // Check cookies were set
    const cookies = agent.getCookies()
    assert.ok(cookies.some((c) => c.startsWith('access_token=')))
    assert.ok(cookies.some((c) => c.startsWith('refresh_token=')))
  })

  await t.test('2. Duplicate registration returns 409 CONFLICT', async () => {
    const res = await agent.post('/api/auth/register', {
      name: 'Duplicate Abebe',
      email: testEmail,
      password: testPassword,
    })

    assert.strictEqual(res.status, 409)
    assert.strictEqual(res.body.error, 'CONFLICT')
  })

  await t.test('3. Verification of identity with /api/auth/me', async () => {
    const res = await agent.get('/api/auth/me')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.user.email, testEmail)
    assert.strictEqual(res.body.data.businessId, businessId)
    assert.strictEqual(res.body.data.role, 'OWNER')
    assert.ok(res.body.data.sessionId)
    sessionId = res.body.data.sessionId
  })

  await t.test('4. Refresh token rotation works', async () => {
    const res = await agent.post('/api/auth/refresh')
    assert.strictEqual(res.status, 200)
    assert.ok(res.body.data.accessToken)
  })

  await t.test('5. Active session list returns registered device', async () => {
    const res = await agent.get('/api/auth/sessions')
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.length >= 1)
    assert.ok(res.body.data.some((s: any) => s.id === sessionId))
  })

  await t.test('6. Logout clears credentials and terminates session', async () => {
    const res = await agent.post('/api/auth/logout')
    assert.ok([200, 204].includes(res.status))

    // Attempting /api/auth/me without cookies fails with 401
    agent.clearCookies()
    const meRes = await agent.get('/api/auth/me')
    assert.strictEqual(meRes.status, 401)
  })

  await t.test('7. Login with bad password returns 401 UNAUTHORIZED', async () => {
    const res = await agent.post('/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!',
    })
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.error, 'UNAUTHORIZED')
  })

  await t.test('8. Login with valid password succeeds', async () => {
    const res = await agent.post('/api/auth/login', {
      email: testEmail,
      password: testPassword,
    })
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.user.email, testEmail)
    assert.strictEqual(res.body.data.businessId, businessId)
    assert.strictEqual(res.body.data.role, 'OWNER')
  })
})
