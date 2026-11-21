import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateParams } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  clockInSchema,
  clockOutSchema,
  createDepartmentSchema,
  createEmployeeSchema,
  createLeaveSchema,
  createPositionSchema,
  createShiftAssignmentSchema,
  createShiftSchema,
  employeeIdParamsSchema,
  updateEmployeeSchema,
  type ClockInInput,
  type ClockOutInput,
  type CreateDepartmentInput,
  type CreateEmployeeInput,
  type CreateLeaveInput,
  type CreatePositionInput,
  type CreateShiftAssignmentInput,
  type CreateShiftInput,
  type UpdateEmployeeInput,
} from './workforce.schema.js'

export const workforceRouter: ExpressRouter = Router()

// All workforce operations require authenticated identity
workforceRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Departments & Job Positions
 * -------------------------------------------------------------
 */

// List active departments
workforceRouter.get('/departments', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const departments = await prisma.department.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return res.json({ data: departments })
})

// Create department
workforceRouter.post(
  '/departments',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createDepartmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateDepartmentInput

    const existing = await prisma.department.findUnique({
      where: { businessId_name: { businessId, name: input.name } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A department with this name already exists.' })
    }

    const department = await prisma.department.create({
      data: {
        businessId,
        name: input.name,
        description: input.description ?? null,
      },
    })

    return res.status(201).json({ data: department })
  }
)

// List job positions
workforceRouter.get('/positions', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const positions = await prisma.jobPosition.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: 'asc' },
  })

  // Enrich with department name if present
  const deptIds = positions.map((p) => p.departmentId).filter(Boolean) as string[]
  const departments = await prisma.department.findMany({
    where: { id: { in: deptIds }, businessId },
  })
  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const enriched = positions.map((p) => ({
    ...p,
    departmentName: p.departmentId ? deptMap.get(p.departmentId) ?? null : null,
  }))

  return res.json({ data: enriched })
})

// Create job position
workforceRouter.post(
  '/positions',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createPositionSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreatePositionInput

    const existing = await prisma.jobPosition.findUnique({
      where: { businessId_name: { businessId, name: input.name } },
    })

    if (existing) {
      return res.status(409).json({ error: 'CONFLICT', message: 'A job position with this name already exists.' })
    }

    if (input.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, businessId },
      })
      if (!dept) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Department not found in this business.' })
      }
    }

    const position = await prisma.jobPosition.create({
      data: {
        businessId,
        name: input.name,
        departmentId: input.departmentId ?? null,
        description: input.description ?? null,
      },
    })

    return res.status(201).json({ data: position })
  }
)

/**
 * -------------------------------------------------------------
 * Employee Directory
 * -------------------------------------------------------------
 */

// List employees with filtering
workforceRouter.get('/employees', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { branchId, status, positionId, search } = req.query

  const where: any = { businessId }

  if (branchId && typeof branchId === 'string') {
    where.branchId = branchId
  }

  if (status && typeof status === 'string') {
    where.status = status
  }

  if (positionId && typeof positionId === 'string') {
    where.positionId = positionId
  }

  if (search && typeof search === 'string') {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // Fetch branches and positions for enrichment
  const branchIds = [...new Set(employees.map((e) => e.branchId))]
  const positionIds = [...new Set(employees.map((e) => e.positionId))]

  const [branches, positions] = await Promise.all([
    prisma.branch.findMany({ where: { id: { in: branchIds }, businessId } }),
    prisma.jobPosition.findMany({ where: { id: { in: positionIds }, businessId } }),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const positionMap = new Map(positions.map((p) => [p.id, p.name]))

  const enriched = employees.map((e) => ({
    ...e,
    branchName: branchMap.get(e.branchId) ?? 'Unknown Branch',
    positionName: positionMap.get(e.positionId) ?? 'Unknown Position',
  }))

  return res.json({ data: enriched })
})

// Register new employee
workforceRouter.post(
  '/employees',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createEmployeeSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateEmployeeInput

    // Determine or auto-generate employeeNumber
    let assignedEmployeeNumber = input.employeeNumber?.trim()
    if (!assignedEmployeeNumber) {
      const count = await prisma.employee.count({ where: { businessId } })
      let candidateNum = count + 1
      let candidate = `EMP-${String(candidateNum).padStart(4, '0')}`
      while (
        await prisma.employee.findUnique({
          where: {
            businessId_employeeNumber: {
              businessId,
              employeeNumber: candidate,
            },
          },
        })
      ) {
        candidateNum++
        candidate = `EMP-${String(candidateNum).padStart(4, '0')}`
      }
      assignedEmployeeNumber = candidate
    } else {
      // Verify employeeNumber uniqueness within business
      const existing = await prisma.employee.findUnique({
        where: {
          businessId_employeeNumber: {
            businessId,
            employeeNumber: assignedEmployeeNumber,
          },
        },
      })

      if (existing) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: `Employee number "${assignedEmployeeNumber}" is already in use in this bakery.`,
        })
      }
    }

    // Verify branch belongs to business
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, businessId },
    })
    if (!branch) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Assigned branch does not exist in this business.' })
    }

    // Verify position belongs to business
    const position = await prisma.jobPosition.findFirst({
      where: { id: input.positionId, businessId },
    })
    if (!position) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Assigned position does not exist in this business.' })
    }

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          businessId,
          branchId: input.branchId,
          positionId: input.positionId,
          employeeNumber: assignedEmployeeNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          employmentType: input.employmentType,
          hireDate: new Date(input.hireDate),
          phone: input.phone ?? null,
          address: input.address ?? null,
          userId: input.userId ?? null,
          status: input.status ?? 'ACTIVE',
        },
      })

      if (input.compensation) {
        await tx.employeeCompensation.create({
          data: {
            businessId,
            employeeId: emp.id,
            compensationType: input.compensation.compensationType,
            rate: input.compensation.rate,
            effectiveFrom: input.compensation.effectiveFrom
              ? new Date(input.compensation.effectiveFrom)
              : new Date(input.hireDate),
          },
        })
      }

      return emp
    })

    return res.status(201).json({
      data: {
        ...employee,
        branchName: branch.name,
        positionName: position.name,
      },
    })
  }
)

// Get employee by ID
workforceRouter.get(
  '/employees/:employeeId',
  validateParams(employeeIdParamsSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const employeeId = req.params.employeeId as string

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found.' })
    }

    const [branch, position, compensations] = await Promise.all([
      prisma.branch.findUnique({ where: { id: employee.branchId } }),
      prisma.jobPosition.findUnique({ where: { id: employee.positionId } }),
      prisma.employeeCompensation.findMany({
        where: { employeeId: employee.id, businessId },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ])

    return res.json({
      data: {
        ...employee,
        branchName: branch?.name ?? null,
        positionName: position?.name ?? null,
        compensations,
      },
    })
  }
)

// Update employee
workforceRouter.patch(
  '/employees/:employeeId',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateParams(employeeIdParamsSchema),
  validateBody(updateEmployeeSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const employeeId = req.params.employeeId as string
    const input = req.body as UpdateEmployeeInput

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found.' })
    }

    if (input.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: input.branchId, businessId },
      })
      if (!branch) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Target branch does not exist.' })
      }
    }

    if (input.positionId) {
      const position = await prisma.jobPosition.findFirst({
        where: { id: input.positionId, businessId },
      })
      if (!position) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'Target position does not exist.' })
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.positionId !== undefined ? { positionId: input.positionId } : {}),
        ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.terminationDate !== undefined
          ? { terminationDate: input.terminationDate ? new Date(input.terminationDate) : null }
          : {}),
      },
    })

    return res.json({ data: updated })
  }
)

/**
 * -------------------------------------------------------------
 * Shifts & Shift Definitions
 * -------------------------------------------------------------
 */

// List shifts
workforceRouter.get('/shifts', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { branchId } = req.query

  const where: any = { businessId, isActive: true }
  if (branchId && typeof branchId === 'string') {
    where.branchId = branchId
  }

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: { startTime: 'asc' },
  })

  return res.json({ data: shifts })
})

// Create shift definition
workforceRouter.post(
  '/shifts',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createShiftSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateShiftInput

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, businessId },
    })
    if (!branch) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Branch not found in this business.' })
    }

    // Helper to format ISO time Date for Prisma @db.Time(6)
    const startDate = new Date(`1970-01-01T${input.startTime}:00.000Z`)
    const endDate = new Date(`1970-01-01T${input.endTime}:00.000Z`)

    // Detect if shift crosses midnight automatically if end <= start
    const crossesMidnight =
      input.crossesMidnight || input.shiftType === 'NIGHT' || endDate <= startDate

    const shift = await prisma.shift.create({
      data: {
        businessId,
        branchId: input.branchId,
        name: input.name,
        shiftType: input.shiftType,
        startTime: startDate,
        endTime: endDate,
        crossesMidnight,
        breakMinutes: input.breakMinutes,
      },
    })

    return res.status(201).json({ data: shift })
  }
)

/**
 * -------------------------------------------------------------
 * Shift Assignments & Scheduling
 * -------------------------------------------------------------
 */

// List shift assignments
workforceRouter.get('/shifts/assignments', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { employeeId, branchId, startDate, endDate } = req.query

  const where: any = { businessId }
  if (employeeId && typeof employeeId === 'string') where.employeeId = employeeId
  if (branchId && typeof branchId === 'string') where.branchId = branchId

  if (startDate && typeof startDate === 'string') {
    where.scheduledStart = { gte: new Date(startDate) }
  }
  if (endDate && typeof endDate === 'string') {
    where.scheduledEnd = { lte: new Date(endDate) }
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where,
    orderBy: { scheduledStart: 'asc' },
  })

  return res.json({ data: assignments })
})

// Create shift assignment with overlap prevention
workforceRouter.post(
  '/shifts/assignments',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createShiftAssignmentSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateShiftAssignmentInput

    // Verify employee belongs to business
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })
    if (!employee) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Employee not found in this business.' })
    }

    // Verify shift belongs to business
    const shift = await prisma.shift.findFirst({
      where: { id: input.shiftId, businessId },
    })
    if (!shift) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Shift not found in this business.' })
    }

    const newStart = new Date(input.scheduledStart)
    const newEnd = new Date(input.scheduledEnd)

    // Overlap Prevention Invariant: check overlapping confirmed/scheduled assignments
    const overlapping = await prisma.shiftAssignment.findFirst({
      where: {
        businessId,
        employeeId: input.employeeId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        AND: [
          { scheduledStart: { lt: newEnd } },
          { scheduledEnd: { gt: newStart } },
        ],
      },
    })

    if (overlapping) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Employee already has an overlapping active shift assignment during this window.',
      })
    }

    const assignment = await prisma.shiftAssignment.create({
      data: {
        businessId,
        branchId: input.branchId,
        employeeId: input.employeeId,
        shiftId: input.shiftId,
        scheduledStart: newStart,
        scheduledEnd: newEnd,
        status: input.status ?? 'SCHEDULED',
        assignedById: req.auth!.userId,
      },
    })

    return res.status(201).json({ data: assignment })
  }
)

/**
 * -------------------------------------------------------------
 * Attendance & Working Hours
 * -------------------------------------------------------------
 */

// List attendance records
workforceRouter.get('/attendance', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const { operationalDate, branchId, employeeId } = req.query

  const where: any = { businessId }
  if (operationalDate && typeof operationalDate === 'string') {
    where.operationalDate = new Date(operationalDate)
  }
  if (branchId && typeof branchId === 'string') where.branchId = branchId
  if (employeeId && typeof employeeId === 'string') where.employeeId = employeeId

  const records = await prisma.attendanceRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ data: records })
})

// Clock in
workforceRouter.post(
  '/attendance/clock-in',
  validateBody(clockInSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as ClockInInput

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })
    if (!employee) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Employee not found.' })
    }

    const opDate = new Date(input.operationalDate)
    const clockInTime = input.clockIn ? new Date(input.clockIn) : new Date()

    let calculatedStatus: 'PRESENT' | 'LATE' = 'PRESENT'

    if (input.shiftAssignmentId) {
      const assignment = await prisma.shiftAssignment.findUnique({
        where: { id: input.shiftAssignmentId },
      })
      if (assignment) {
        // If clockIn is more than 15 minutes after scheduledStart, mark LATE
        const lateThreshold = new Date(assignment.scheduledStart.getTime() + 15 * 60 * 1000)
        if (clockInTime > lateThreshold) {
          calculatedStatus = 'LATE'
        }
      }
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        businessId,
        branchId: input.branchId,
        employeeId: input.employeeId,
        shiftAssignmentId: input.shiftAssignmentId ?? null,
        operationalDate: opDate,
        clockIn: clockInTime,
        status: calculatedStatus,
        notes: input.notes ?? null,
        recordedById: req.auth!.userId,
      },
    })

    return res.status(201).json({ data: record })
  }
)

// Clock out
workforceRouter.post(
  '/attendance/clock-out',
  validateBody(clockOutSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as ClockOutInput

    const record = await prisma.attendanceRecord.findFirst({
      where: { id: input.attendanceId, businessId },
    })

    if (!record || !record.clockIn) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Active clock-in attendance record not found.' })
    }

    const clockOutTime = input.clockOut ? new Date(input.clockOut) : new Date()
    const breakMins = input.breakMinutes ?? record.breakMinutes ?? 0

    // Elapsed milliseconds
    const elapsedMs = clockOutTime.getTime() - record.clockIn.getTime()
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / (60 * 1000)) - breakMins)

    // Calculate overtime if associated with a scheduled shift
    let overtimeMinutes = 0
    if (record.shiftAssignmentId) {
      const assignment = await prisma.shiftAssignment.findUnique({
        where: { id: record.shiftAssignmentId },
      })
      if (assignment) {
        const scheduledMins = Math.floor(
          (assignment.scheduledEnd.getTime() - assignment.scheduledStart.getTime()) / (60 * 1000)
        )
        if (elapsedMinutes > scheduledMins) {
          overtimeMinutes = elapsedMinutes - scheduledMins
        }
      }
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: clockOutTime,
        breakMinutes: breakMins,
        overtimeMinutes,
        notes: input.notes ? `${record.notes ? record.notes + '; ' : ''}${input.notes}` : record.notes,
      },
    })

    return res.json({
      data: {
        ...updated,
        totalWorkingMinutes: elapsedMinutes,
      },
    })
  }
)

// Record leave / absence
workforceRouter.post(
  '/leaves',
  requireRole('OWNER', 'ADMIN', 'BRANCH_MANAGER'),
  validateBody(createLeaveSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateLeaveInput

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId },
    })
    if (!employee) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Employee not found.' })
    }

    const leave = await prisma.leaveRecord.create({
      data: {
        businessId,
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason ?? null,
        status: input.status,
        approvedById: req.auth!.userId,
      },
    })

    return res.status(201).json({ data: leave })
  }
)

/**
 * -------------------------------------------------------------
 * Headcount & Workforce Reporting
 * -------------------------------------------------------------
 */

// Headcount analytics (excludes inactive/terminated from current active count)
workforceRouter.get('/reports/headcount', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const [employees, branches, departments, positions] = await Promise.all([
    prisma.employee.findMany({ where: { businessId } }),
    prisma.branch.findMany({ where: { businessId } }),
    prisma.department.findMany({ where: { businessId } }),
    prisma.jobPosition.findMany({ where: { businessId } }),
  ])

  // Invariant: Headcount rule - do not count inactive/terminated as active
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE')
  const inactiveEmployees = employees.filter((e) => e.status === 'INACTIVE')
  const terminatedEmployees = employees.filter((e) => e.status === 'TERMINATED')

  // Group by branch
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))
  const byBranch = branches.map((b) => ({
    branchId: b.id,
    branchName: b.name,
    activeCount: activeEmployees.filter((e) => e.branchId === b.id).length,
  }))

  // Group by position
  const positionMap = new Map(positions.map((p) => [p.id, p]))
  const byPosition = positions.map((p) => ({
    positionId: p.id,
    positionName: p.name,
    activeCount: activeEmployees.filter((e) => e.positionId === p.id).length,
  }))

  // Group by department
  const byDepartment = departments.map((d) => {
    const deptPositionIds = new Set(positions.filter((p) => p.departmentId === d.id).map((p) => p.id))
    return {
      departmentId: d.id,
      departmentName: d.name,
      activeCount: activeEmployees.filter((e) => deptPositionIds.has(e.positionId)).length,
    }
  })

  // Employment type breakdown
  const byEmploymentType = {
    FULL_TIME: activeEmployees.filter((e) => e.employmentType === 'FULL_TIME').length,
    PART_TIME: activeEmployees.filter((e) => e.employmentType === 'PART_TIME').length,
    CONTRACT: activeEmployees.filter((e) => e.employmentType === 'CONTRACT').length,
    TEMPORARY: activeEmployees.filter((e) => e.employmentType === 'TEMPORARY').length,
  }

  return res.json({
    data: {
      totalEmployees: employees.length,
      activeHeadcount: activeEmployees.length,
      inactiveCount: inactiveEmployees.length,
      terminatedCount: terminatedEmployees.length,
      byBranch,
      byPosition,
      byDepartment,
      byEmploymentType,
    },
  })
})
