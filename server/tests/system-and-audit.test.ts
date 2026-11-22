import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('System Settings, Telemetry & Audit Logs Suite', async (t) => {
  const unauthAgent = new TestAgent()
  const adminAgent = new TestAgent()

  await adminAgent.start()
  unauthAgent.baseUrl = adminAgent.baseUrl

  const email = `sys-admin-${Date.now()}@kdplc.et`
  const password = 'Password123!'

  let businessId = ''
  let userId = ''

  t.after(async () => {
    await adminAgent.close()
    if (businessId) {
      await prisma.auditLog.deleteMany({ where: { businessId } })
      await cleanupTestData([businessId], [userId])
    }
    await prisma.$disconnect()
  })

  await t.test('1. Setup Owner user & register business', async () => {
    const res = await adminAgent.post('/api/auth/register', {
      name: 'KD PLC SuperAdmin',
      email,
      password,
      businessName: 'KD PLC System Test Bakery',
    })
    assert.strictEqual(res.status, 201)
    businessId = res.body.data.business.id
    userId = res.body.data.user.id
  })

  await t.test('2. GET /api/system/status requires authentication', async () => {
    const res = await unauthAgent.get('/api/system/status')
    assert.strictEqual(res.status, 401)
  })

  await t.test('3. GET /api/system/status returns full telemetry for OWNER/ADMIN', async () => {
    const res = await adminAgent.get('/api/system/status')
    assert.strictEqual(res.status, 200)
    assert.ok(res.body.data)
    assert.strictEqual(res.body.data.database.status, 'CONNECTED')
    assert.ok(typeof res.body.data.database.latencyMs === 'number')
    assert.ok(res.body.data.memory.heapUsedMb > 0)
    assert.ok(res.body.data.runtime.uptimeSeconds >= 0)
    assert.ok(res.body.data.syncEngine)
    assert.ok(res.body.data.security)
    assert.ok(['HEALTHY', 'DEGRADED', 'MAINTENANCE'].includes(res.body.data.health))
  })

  await t.test('4. GET /api/system/settings returns operational parameters', async () => {
    const res = await adminAgent.get('/api/system/settings')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.body.data.businessId, businessId)
    assert.strictEqual(res.body.data.employeeNumberPrefix, 'EMP')
    assert.strictEqual(res.body.data.minQualityYieldPercent, 85)
    assert.strictEqual(res.body.data.maintenanceMode, false)
  })

  await t.test('5. PATCH /api/system/settings updates tweaks and writes audit log', async () => {
    const patchRes = await adminAgent.patch('/api/system/settings', {
      employeeNumberPrefix: 'KD',
      minQualityYieldPercent: 90,
      maintenanceMode: true,
      autoSyncIntervalSeconds: 45,
    })
    assert.strictEqual(patchRes.status, 200)
    assert.strictEqual(patchRes.body.data.employeeNumberPrefix, 'KD')
    assert.strictEqual(patchRes.body.data.minQualityYieldPercent, 90)
    assert.strictEqual(patchRes.body.data.maintenanceMode, true)
    assert.strictEqual(patchRes.body.data.autoSyncIntervalSeconds, 45)

    // Verify system status reflects maintenance mode
    const statusRes = await adminAgent.get('/api/system/status')
    assert.strictEqual(statusRes.body.data.health, 'MAINTENANCE')

    // Restore maintenance mode to false
    await adminAgent.patch('/api/system/settings', { maintenanceMode: false })
  })

  await t.test('6. GET /api/audit-logs retrieves trail of events including settings tweak', async () => {
    const res = await adminAgent.get('/api/audit-logs')
    assert.strictEqual(res.status, 200)
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.length >= 1)

    const updateEvent = res.body.data.find(
      (log: any) => log.action === 'UPDATE_SYSTEM_SETTINGS'
    )
    assert.ok(updateEvent, 'Should find UPDATE_SYSTEM_SETTINGS audit entry')
    assert.strictEqual(updateEvent.entityType, 'SYSTEM_SETTINGS')
    assert.strictEqual(updateEvent.actorId, userId)
    assert.strictEqual(updateEvent.actor.name, 'KD PLC SuperAdmin')
    assert.ok(updateEvent.beforeData)
    assert.ok(updateEvent.afterData)
  })

  await t.test('7. POST /api/audit-logs can record custom events and filter by action', async () => {
    const postRes = await adminAgent.post('/api/audit-logs', {
      action: 'SECURITY_KEY_ROTATION',
      entityType: 'SECURITY',
      reason: 'Manual routine credential check',
      source: 'WEB',
    })
    assert.strictEqual(postRes.status, 201)

    // Filter by action
    const filterRes = await adminAgent.get('/api/audit-logs?action=SECURITY_KEY')
    assert.strictEqual(filterRes.status, 200)
    assert.strictEqual(filterRes.body.data.length, 1)
    assert.strictEqual(filterRes.body.data[0].action, 'SECURITY_KEY_ROTATION')
  })
})
