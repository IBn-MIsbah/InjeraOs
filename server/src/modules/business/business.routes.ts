import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateParams } from '../../middleware/validate-request.js'
import { authenticate, requireAnyPermission, requireRole } from '../auth/index.js'
import {
  branchIdParamsSchema,
  createBranchSchema,
  inviteMemberSchema,
  updateBranchSchema,
  updateBusinessSchema,
  type CreateBranchInput,
  type InviteMemberInput,
  type UpdateBranchInput,
  type UpdateBusinessInput,
} from './business.schema.js'

export const businessRouter: ExpressRouter = Router()
export const branchRouter: ExpressRouter = Router()

// All endpoints require an authenticated user within a business context
businessRouter.use(authenticate)
branchRouter.use(authenticate)

/**
 * -------------------------------------------------------------
 * Business Profile & Settings Endpoints
 * -------------------------------------------------------------
 */

// Get current business configuration
businessRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  })

  if (!business) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Business not found.' })
  }

  return res.json({ data: business })
})

// Update business configuration (requires OWNER, ADMIN or business.manage)
businessRouter.patch(
  '/',
  requireRole('OWNER', 'ADMIN'),
  validateBody(updateBusinessSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as UpdateBusinessInput

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.dateCalendar !== undefined ? { dateCalendar: input.dateCalendar } : {}),
      },
    })

    return res.json({ data: updated })
  }
)

/**
 * -------------------------------------------------------------
 * Business Team Members & Invitations Endpoints
 * -------------------------------------------------------------
 */

// List all team members in the current business
businessRouter.get('/members', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const memberships = await prisma.businessMembership.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  })

  const userIds = memberships.map((m) => m.userId)
  const roleIds = memberships.map((m) => m.roleId)
  const membershipIds = memberships.map((m) => m.id)

  const [users, roles, branchAccesses] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    }),
    prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, description: true, isSystem: true },
    }),
    prisma.membershipBranchAccess.findMany({
      where: { membershipId: { in: membershipIds } },
    }),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const roleMap = new Map(roles.map((r) => [r.id, r]))
  const branchAccessMap = new Map<string, string[]>()

  for (const ba of branchAccesses) {
    const list = branchAccessMap.get(ba.membershipId) ?? []
    list.push(ba.branchId)
    branchAccessMap.set(ba.membershipId, list)
  }

  const enrichedMembers = memberships.map((m) => {
    const user = userMap.get(m.userId)
    const role = roleMap.get(m.roleId)
    return {
      id: m.id,
      userId: m.userId,
      name: user?.name ?? 'Unknown',
      email: user?.email ?? '',
      phone: user?.phone,
      roleId: m.roleId,
      roleName: role?.name ?? 'MEMBER',
      roleDescription: role?.description,
      status: m.status,
      branchIds: branchAccessMap.get(m.id) ?? [],
      createdAt: m.createdAt,
    }
  })

  return res.json({ data: enrichedMembers })
})

// Invite or provision a new team member
businessRouter.post(
  '/members/invite',
  requireRole('OWNER', 'ADMIN'),
  validateBody(inviteMemberSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as InviteMemberInput

    // Verify role exists for this business or is a system template
    const role = await prisma.role.findFirst({
      where: {
        id: input.roleId,
        OR: [{ businessId: null }, { businessId }],
      },
    })

    if (!role) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Selected role does not exist.' })
    }

    if (role.name === 'OWNER' && req.auth!.role !== 'OWNER') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only an owner can grant the OWNER role.' })
    }

    const member = await prisma.$transaction(async (tx) => {
      // Find or create user account
      let user = await tx.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        user = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: null, // Invited user sets password upon initial invite acceptance
          },
        })
      }

      // Check if user is already a member of this business
      const existingMembership = await tx.businessMembership.findFirst({
        where: { businessId, userId: user.id },
      })

      if (existingMembership) {
        throw new Error('User is already a member of this business.')
      }

      const membership = await tx.businessMembership.create({
        data: {
          businessId,
          userId: user.id,
          roleId: role.id,
          status: 'ACTIVE',
        },
      })

      // Link branch accesses if provided
      if (input.branchIds.length > 0) {
        await tx.membershipBranchAccess.createMany({
          data: input.branchIds.map((branchId) => ({
            membershipId: membership.id,
            branchId,
          })),
          skipDuplicates: true,
        })
      }

      return {
        id: membership.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        roleId: role.id,
        roleName: role.name,
        status: membership.status,
        branchIds: input.branchIds,
        createdAt: membership.createdAt,
      }
    })

    return res.status(201).json({ data: member })
  }
)

/**
 * -------------------------------------------------------------
 * Branches & Locations Endpoints
 * -------------------------------------------------------------
 */

// List all bakery branches for the current business
branchRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const branches = await prisma.branch.findMany({
    where: { businessId },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
  })

  return res.json({ data: branches })
})

// Create a new branch (restricted to OWNER, ADMIN, or branch.manage)
branchRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN'),
  validateBody(createBranchSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const input = req.body as CreateBranchInput

    // Check code uniqueness within business
    const existingCode = await prisma.branch.findFirst({
      where: { businessId, code: input.code },
    })

    if (existingCode) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: `A branch with code "${input.code}" already exists in this business.`,
      })
    }

    const branch = await prisma.$transaction(async (tx) => {
      if (input.isMain) {
        // Demote existing main branches
        await tx.branch.updateMany({
          where: { businessId, isMain: true },
          data: { isMain: false },
        })
      }

      return tx.branch.create({
        data: {
          businessId,
          name: input.name,
          code: input.code,
          address: input.address ?? null,
          phone: input.phone ?? null,
          isMain: input.isMain,
          status: 'ACTIVE',
        },
      })
    })

    return res.status(201).json({ data: branch })
  }
)

// Update an existing branch
branchRouter.patch(
  '/:branchId',
  requireRole('OWNER', 'ADMIN'),
  validateParams(branchIdParamsSchema),
  validateBody(updateBranchSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const branchId = req.params.branchId as string
    const input = req.body as UpdateBranchInput

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId },
    })

    if (!branch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found.' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isMain) {
        await tx.branch.updateMany({
          where: { businessId, isMain: true, id: { not: branchId } },
          data: { isMain: false },
        })
      }

      return tx.branch.update({
        where: { id: branchId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.isMain !== undefined ? { isMain: input.isMain } : {}),
        },
      })
    })

    return res.json({ data: updated })
  }
)

// Deactivate a branch
branchRouter.delete(
  '/:branchId',
  requireRole('OWNER', 'ADMIN'),
  validateParams(branchIdParamsSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const branchId = req.params.branchId as string

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId },
    })

    if (!branch) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found.' })
    }

    const deactivated = await prisma.branch.update({
      where: { id: branchId },
      data: { status: 'INACTIVE' },
    })

    return res.json({ data: deactivated })
  }
)
