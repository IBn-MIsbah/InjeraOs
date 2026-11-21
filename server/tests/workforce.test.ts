import test from 'node:test'
import assert from 'node:assert/strict'
import { TestAgent, cleanupTestData, prisma } from './test-helper.js'

test('Milestone 2: Employee and Workforce Foundation Suite', async (t) => {
  const agentA = new TestAgent()
  const agentB = new TestAgent()
  await agentA.start()
  agentB.baseUrl = agentA.baseUrl

  let businessAId = ''
  let businessBId = ''
  let ownerAId = ''
  let ownerBId = ''

  let branchAId = ''
  let deptAId = ''
  let positionAId = ''
  let employee1Id = ''
  let employee2Id = ''
  let dayShiftId = ''
  let nightShiftId = ''
  let assignment1Id = ''
  let attendanceRecordId = ''

  t.after(async () => {
    await agentA.close()
    const businessIds = [businessAId, businessBId].filter(Boolean)
    const userIds = [ownerAId, ownerBId].filter(Boolean)

    if (businessIds.length > 0) {
      await prisma.attendanceRecord.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shiftAssignment.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.shift.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employeeCompensation.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.employee.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.jobPosition.deleteMany({ where: { businessId: { in: businessIds } } })
      await prisma.department.deleteMany({ where: { businessId: { in: businessIds } } })
      await cleanupTestData(businessIds, userIds)
    }
    await prisma.$disconnect()
  })

  await t.test('1. Setup Tenant A and Tenant B businesses and branches', async () => {
    const regA = await agentA.post('/api/auth/register', {
      email: `owner-wf-a-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Workforce Owner A',
      businessName: 'Addis Sheger Workforce Hub',
    })
    assert.equal(regA.status, 201)
    businessAId = regA.body.data.business.id
    ownerAId = regA.body.data.user.id

    const branchRes = await agentA.post('/api/branches', {
      name: 'Main Production Hub',
      code: 'PROD-01',
      isMain: true,
    })
    assert.equal(branchRes.status, 201)
    branchAId = branchRes.body.data.id

    const regB = await agentB.post('/api/auth/register', {
      email: `owner-wf-b-${Date.now()}@bakery.et`,
      password: 'Password123!',
      name: 'Workforce Owner B',
      businessName: 'Bole Traditional Injera',
    })
    assert.equal(regB.status, 201)
    businessBId = regB.body.data.business.id
    ownerBId = regB.body.data.user.id
  })

  await t.test('2. Create department and job position for Tenant A', async () => {
    const deptRes = await agentA.post('/api/workforce/departments', {
      name: 'Baking Operations',
      description: 'Dough mixing, fermenting, and mitad baking lines.',
    })
    assert.equal(deptRes.status, 201)
    assert.equal(deptRes.body.data.name, 'Baking Operations')
    deptAId = deptRes.body.data.id

    const posRes = await agentA.post('/api/workforce/positions', {
      name: 'Master Injera Baker',
      departmentId: deptAId,
      description: 'Experienced clay mitad baker.',
    })
    assert.equal(posRes.status, 201)
    assert.equal(posRes.body.data.name, 'Master Injera Baker')
    positionAId = posRes.body.data.id
  })

  await t.test('3. Register active employees with unique employee numbers', async () => {
    const emp1Res = await agentA.post('/api/workforce/employees', {
      firstName: 'Almaz',
      lastName: 'Tadesse',
      employeeNumber: 'EMP-001',
      branchId: branchAId,
      positionId: positionAId,
      employmentType: 'FULL_TIME',
      hireDate: '2026-01-15',
      phone: '+251911112233',
      compensation: {
        compensationType: 'MONTHLY',
        rate: 8500,
      },
    })
    assert.equal(emp1Res.status, 201)
    assert.equal(emp1Res.body.data.employeeNumber, 'EMP-001')
    assert.equal(emp1Res.body.data.status, 'ACTIVE')
    employee1Id = emp1Res.body.data.id

    const emp2Res = await agentA.post('/api/workforce/employees', {
      firstName: 'Kassahun',
      lastName: 'Bekele',
      employeeNumber: 'EMP-002',
      branchId: branchAId,
      positionId: positionAId,
      employmentType: 'CONTRACT',
      hireDate: '2026-02-01',
      status: 'INACTIVE', // Inactive worker to verify headcount rule
    })
    assert.equal(emp2Res.status, 201)
    assert.equal(emp2Res.body.data.employeeNumber, 'EMP-002')
    assert.equal(emp2Res.body.data.status, 'INACTIVE')
    employee2Id = emp2Res.body.data.id
  })

  await t.test('4. Reject duplicate employee number within same business', async () => {
    const dupRes = await agentA.post('/api/workforce/employees', {
      firstName: 'Duplicate',
      lastName: 'Worker',
      employeeNumber: 'EMP-001', // Already used
      branchId: branchAId,
      positionId: positionAId,
      employmentType: 'FULL_TIME',
      hireDate: '2026-02-10',
    })
    assert.equal(dupRes.status, 409)
  })

  await t.test('5. Shift definition correctness: Day shift and Overnight Night shift', async () => {
    // Day shift (06:00 to 14:00)
    const dayRes = await agentA.post('/api/workforce/shifts', {
      branchId: branchAId,
      name: 'Morning Baking Shift',
      shiftType: 'DAY',
      startTime: '06:00',
      endTime: '14:00',
      crossesMidnight: false,
      breakMinutes: 30,
    })
    assert.equal(dayRes.status, 201)
    assert.equal(dayRes.body.data.crossesMidnight, false)
    dayShiftId = dayRes.body.data.id

    // Night shift (22:00 to 06:00) - crosses midnight
    const nightRes = await agentA.post('/api/workforce/shifts', {
      branchId: branchAId,
      name: 'Overnight Baking Shift',
      shiftType: 'NIGHT',
      startTime: '22:00',
      endTime: '06:00',
      crossesMidnight: true,
      breakMinutes: 45,
    })
    assert.equal(nightRes.status, 201)
    assert.equal(nightRes.body.data.crossesMidnight, true)
    nightShiftId = nightRes.body.data.id
  })

  await t.test('6. Shift assignment with Overlap Prevention invariant', async () => {
    // Schedule Almaz for 2026-03-01 06:00 to 14:00
    const assignRes = await agentA.post('/api/workforce/shifts/assignments', {
      branchId: branchAId,
      employeeId: employee1Id,
      shiftId: dayShiftId,
      scheduledStart: '2026-03-01T06:00:00.000Z',
      scheduledEnd: '2026-03-01T14:00:00.000Z',
      status: 'CONFIRMED',
    })
    assert.equal(assignRes.status, 201)
    assignment1Id = assignRes.body.data.id

    // Attempt overlapping schedule for same employee (08:00 to 16:00) -> 409 CONFLICT
    const overlapRes = await agentA.post('/api/workforce/shifts/assignments', {
      branchId: branchAId,
      employeeId: employee1Id,
      shiftId: dayShiftId,
      scheduledStart: '2026-03-01T08:00:00.000Z',
      scheduledEnd: '2026-03-01T16:00:00.000Z',
      status: 'CONFIRMED',
    })
    assert.equal(overlapRes.status, 409)
  })

  await t.test('7. Attendance clock-in and clock-out with elapsed duration calculation', async () => {
    // Clock in on-time for scheduled assignment
    const clockInRes = await agentA.post('/api/workforce/attendance/clock-in', {
      branchId: branchAId,
      employeeId: employee1Id,
      shiftAssignmentId: assignment1Id,
      operationalDate: '2026-03-01',
      clockIn: '2026-03-01T06:05:00.000Z',
    })
    assert.equal(clockInRes.status, 201)
    assert.equal(clockInRes.body.data.status, 'PRESENT')
    attendanceRecordId = clockInRes.body.data.id

    // Clock out after 8 hours (clockIn 06:05 to clockOut 14:35 = 510 mins, break 30m = 480 net mins, overtime 0)
    const clockOutRes = await agentA.post('/api/workforce/attendance/clock-out', {
      attendanceId: attendanceRecordId,
      clockOut: '2026-03-01T14:35:00.000Z',
      breakMinutes: 30,
      notes: 'Cleaned mitad ovens before handover.',
    })
    assert.equal(clockOutRes.status, 200)
    assert.equal(clockOutRes.body.data.totalWorkingMinutes, 480)
  })

  await t.test('8. Headcount report invariant: inactive employees excluded from active count', async () => {
    const reportRes = await agentA.get('/api/workforce/reports/headcount')
    assert.equal(reportRes.status, 200)
    assert.equal(reportRes.body.data.totalEmployees, 2)
    assert.equal(reportRes.body.data.activeHeadcount, 1) // Only EMP-001 (Almaz)
    assert.equal(reportRes.body.data.inactiveCount, 1) // EMP-002 (Kassahun)
  })

  await t.test('9. Cross-tenant isolation: Tenant B cannot access Tenant A workforce data', async () => {
    // Tenant B listing employees should return empty list
    const listB = await agentB.get('/api/workforce/employees')
    assert.equal(listB.status, 200)
    assert.equal(listB.body.data.length, 0)

    // Tenant B direct lookup of Tenant A employee returns 404
    const getB = await agentB.get(`/api/workforce/employees/${employee1Id}`)
    assert.equal(getB.status, 404)

    // Tenant B cannot modify Tenant A employee
    const patchB = await agentB.patch(`/api/workforce/employees/${employee1Id}`, {
      firstName: 'Hacked',
    })
    assert.equal(patchB.status, 404)
  })

  await t.test('10. Auto-assign employee number by system when omitted', async () => {
    // Register branch for Tenant B
    const branchBRes = await agentB.post('/api/branches', {
      name: 'Bole Hub',
      code: 'BOLE-01',
      isMain: true,
    })
    assert.equal(branchBRes.status, 201)

    // Register position for Tenant B
    const posBRes = await agentB.post('/api/workforce/positions', {
      name: 'Shift Supervisor',
    })
    assert.equal(posBRes.status, 201)

    // Register employee without employeeNumber
    const empAutoRes = await agentB.post('/api/workforce/employees', {
      firstName: 'Solomon',
      lastName: 'Girma',
      branchId: branchBRes.body.data.id,
      positionId: posBRes.body.data.id,
      employmentType: 'FULL_TIME',
      hireDate: '2026-03-01',
    })
    assert.equal(empAutoRes.status, 201)
    assert.match(empAutoRes.body.data.employeeNumber, /^EMP-\d{4}$/)
  })
})
