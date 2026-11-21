import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Roles & Permissions RBAC Suite', async (t) => {
  const ownerAgent = new TestAgent()
  const staffAgent = new TestAgent()
  await ownerAgent.start()
  staffAgent.baseUrl = ownerAgent.baseUrl

  const ownerEmail = `owner-${Date.now()}@bakery-rbac.et`
  const staffEmail = `staff-${Date.now()}@bakery-rbac.et`
  const password = 'Password123!'

  let businessId = ''
  let ownerUserId = ''
  let staffUserId = ''
  let staffMembershipId = ''
  let customRoleId = ''

  t.after(async () => {
    await ownerAgent.close()
    await cleanupTestData([businessId], [ownerUserId, staffUserId])
  })

  await t.test('1. Owner registers and standard roles are verified', async () => {
    const res = await ownerAgent.post('/api/auth/register', {
      name: 'Bakery Proprietor',
      email: ownerEmail,
      password,
      businessName: 'Piassa Special Injera',
    })

    assert.strictEqual(res.status, 201)
    businessId = res.body.data.business.id
    ownerUserId = res.body.data.user.id

    // Check roles available for this business
    const rolesRes = await ownerAgent.get('/api/roles')
    assert.strictEqual(rolesRes.status, 200)
    assert.ok(Array.isArray(rolesRes.body.data))

    const roleNames = rolesRes.body.data.map((r: any) => r.name)
    assert.ok(roleNames.includes('OWNER'))
    assert.ok(roleNames.includes('ADMIN'))
    assert.ok(roleNames.includes('BRANCH_MANAGER'))
    assert.ok(roleNames.includes('PRODUCTION_SUPERVISOR'))
    assert.ok(roleNames.includes('BAKER'))
    assert.ok(roleNames.includes('INVENTORY_CLERK'))
    assert.ok(roleNames.includes('SALES_CASHIER'))
    assert.ok(roleNames.includes('ACCOUNTANT'))
  })

  await t.test('2. Permissions catalog returns all 35 permissions', async () => {
    const permRes = await ownerAgent.get('/api/roles/permissions')
    assert.strictEqual(permRes.status, 200)
    assert.ok(Array.isArray(permRes.body.data))
    assert.strictEqual(permRes.body.data.length, 35)

    const permCodes = permRes.body.data.map((p: any) => p.code)
    assert.ok(permCodes.includes('production.output.record'))
    assert.ok(permCodes.includes('sale.create'))
    assert.ok(permCodes.includes('inventory.read'))
  })

  await t.test('3. Create a custom business role', async () => {
    const res = await ownerAgent.post('/api/roles', {
      name: 'HEAD_BAKER',
      description: 'Senior stove master overseeing baking quality',
      permissionCodes: [
        'production.batch.read',
        'production.output.record',
        'product.read',
      ],
    })

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.data.name, 'HEAD_BAKER')
    assert.strictEqual(res.body.data.isSystem, false)
    customRoleId = res.body.data.id

    // Verify role details and permissions
    const getRes = await ownerAgent.get(`/api/roles/${customRoleId}`)
    assert.strictEqual(getRes.status, 200)
    assert.strictEqual(getRes.body.data.permissions.length, 3)
  })

  await t.test('4. Update permissions for the custom role', async () => {
    const updatePermRes = await ownerAgent.put(`/api/roles/${customRoleId}/permissions`, {
      permissionCodes: ['production.batch.read', 'production.output.record'],
    })

    assert.strictEqual(updatePermRes.status, 200)
    assert.strictEqual(updatePermRes.body.data.permissions.length, 2)
  })

  await t.test('5. Assign custom role to a team member', async () => {
    // Create a staff user directly linked to this business
    const passwordHash = await prisma.user.create({
      data: {
        name: 'Dawit Baker',
        email: staffEmail,
        passwordHash: 'dummy-hash',
      },
    })
    staffUserId = passwordHash.id

    // Create a default BAKER membership
    const bakerRole = await prisma.role.findFirst({
      where: { businessId, name: 'BAKER' },
    })
    assert.ok(bakerRole)

    const membership = await prisma.businessMembership.create({
      data: {
        userId: staffUserId,
        businessId,
        roleId: bakerRole.id,
        status: 'ACTIVE',
      },
    })
    staffMembershipId = membership.id

    // Promote staff member to HEAD_BAKER
    const promoteRes = await ownerAgent.patch(`/api/roles/members/${staffMembershipId}`, {
      roleId: customRoleId,
    })

    assert.strictEqual(promoteRes.status, 200)
    assert.strictEqual(promoteRes.body.data.roleName, 'HEAD_BAKER')

    // Verify in database
    const updatedMembership = await prisma.businessMembership.findUnique({
      where: { id: staffMembershipId },
    })
    assert.strictEqual(updatedMembership?.roleId, customRoleId)
  })
})
