import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateParams } from '../../middleware/validate-request.js'
import { authenticate, requireRole } from '../auth/index.js'
import {
  assignMemberRoleSchema,
  createRoleSchema,
  membershipIdParamsSchema,
  roleIdParamsSchema,
  setRolePermissionsSchema,
  updateRoleSchema,
  type AssignMemberRoleInput,
  type CreateRoleInput,
  type SetRolePermissionsInput,
  type UpdateRoleInput,
} from './role.schema.js'

export const roleRouter: ExpressRouter = Router()

// All role endpoints require an authenticated user
roleRouter.use(authenticate)

/**
 * List all available system permissions for display and assignment
 */
roleRouter.get('/permissions', async (_req: Request, res: Response) => {
  const permissions = await prisma.permission.findMany({
    orderBy: { code: 'asc' },
  })
  return res.json({ data: permissions })
})

/**
 * List all roles available to the current business (system + business-specific)
 */
roleRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const roles = await prisma.role.findMany({
    where: {
      OR: [{ businessId: null }, { businessId }],
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  // Fetch permissions for all returned roles
  const roleIds = roles.map((r) => r.id)
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
  })

  const permissionIds = Array.from(new Set(rolePermissions.map((rp) => rp.permissionId)))
  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  })
  const permMap = new Map(permissions.map((p) => [p.id, p]))

  // Map permissions by roleId
  const rolePermsMap = new Map<string, typeof permissions>()
  for (const rp of rolePermissions) {
    const list = rolePermsMap.get(rp.roleId) ?? []
    const perm = permMap.get(rp.permissionId)
    if (perm) list.push(perm)
    rolePermsMap.set(rp.roleId, list)
  }

  const enrichedRoles = roles.map((role) => ({
    id: role.id,
    businessId: role.businessId,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions:
      role.name === 'OWNER'
        ? [{ id: 'all', code: '*', description: 'Full business access' }]
        : rolePermsMap.get(role.id) ?? [],
  }))

  return res.json({ data: enrichedRoles })
})

/**
 * Get single role details with permissions
 */
roleRouter.get(
  '/:roleId',
  validateParams(roleIdParamsSchema),
  async (req: Request, res: Response) => {
    const roleId = req.params.roleId as string
    const businessId = req.auth!.businessId

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ businessId: null }, { businessId }],
      },
    })

    if (!role) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Role not found.' })
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
    })

    const permissions = rolePermissions.length
      ? await prisma.permission.findMany({
          where: { id: { in: rolePermissions.map((rp) => rp.permissionId) } },
        })
      : []

    return res.json({
      data: {
        ...role,
        permissions:
          role.name === 'OWNER'
            ? [{ id: 'all', code: '*', description: 'Full business access' }]
            : permissions,
      },
    })
  }
)

/**
 * Create a custom role for the business (restricted to OWNER and ADMIN)
 */
roleRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN'),
  validateBody(createRoleSchema),
  async (req: Request, res: Response) => {
    const input = req.body as CreateRoleInput
    const businessId = req.auth!.businessId

    const existingRole = await prisma.role.findFirst({
      where: { businessId, name: input.name },
    })

    if (existingRole) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: `A role named "${input.name}" already exists for this business.`,
      })
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          businessId,
          name: input.name,
          description: input.description ?? null,
          isSystem: false,
        },
      })

      if (input.permissionCodes.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: input.permissionCodes } },
        })

        if (perms.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({
              roleId: created.id,
              permissionId: p.id,
            })),
            skipDuplicates: true,
          })
        }
      }

      return created
    })

    return res.status(201).json({ data: role })
  }
)

/**
 * Update custom role details (restricted to OWNER and ADMIN)
 */
roleRouter.patch(
  '/:roleId',
  requireRole('OWNER', 'ADMIN'),
  validateParams(roleIdParamsSchema),
  validateBody(updateRoleSchema),
  async (req: Request, res: Response) => {
    const roleId = req.params.roleId as string
    const input = req.body as UpdateRoleInput
    const businessId = req.auth!.businessId

    const role = await prisma.role.findFirst({
      where: { id: roleId, businessId },
    })

    if (!role) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Role not found or cannot be modified because it is a system template.',
      })
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    })

    return res.json({ data: updated })
  }
)

/**
 * Configure permissions for a business role (restricted to OWNER and ADMIN)
 */
roleRouter.put(
  '/:roleId/permissions',
  requireRole('OWNER', 'ADMIN'),
  validateParams(roleIdParamsSchema),
  validateBody(setRolePermissionsSchema),
  async (req: Request, res: Response) => {
    const roleId = req.params.roleId as string
    const input = req.body as SetRolePermissionsInput
    const businessId = req.auth!.businessId

    const role = await prisma.role.findFirst({
      where: { id: roleId, businessId },
    })

    if (!role) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Role not found or is a system role that cannot be directly edited.',
      })
    }

    if (role.name === 'OWNER') {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'The OWNER role inherently has wildcard (*) access and cannot have permissions removed.',
      })
    }

    const matchedPermissions = await prisma.permission.findMany({
      where: { code: { in: input.permissionCodes } },
    })

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      })

      if (matchedPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: matchedPermissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        })
      }
    })

    return res.json({
      data: {
        roleId: role.id,
        permissions: matchedPermissions,
      },
    })
  }
)

/**
 * Assign or update a member's role within the business
 */
roleRouter.patch(
  '/members/:membershipId',
  requireRole('OWNER', 'ADMIN'),
  validateParams(membershipIdParamsSchema),
  validateBody(assignMemberRoleSchema),
  async (req: Request, res: Response) => {
    const membershipId = req.params.membershipId as string
    const { roleId } = req.body as AssignMemberRoleInput
    const businessId = req.auth!.businessId

    const membership = await prisma.businessMembership.findFirst({
      where: { id: membershipId, businessId },
    })

    if (!membership) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Team membership not found.' })
    }

    // Verify target role exists and belongs to this business or is a system role
    const targetRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ businessId: null }, { businessId }],
      },
    })

    if (!targetRole) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Target role does not exist.' })
    }

    // Prevent non-owners from promoting anyone to OWNER
    if (targetRole.name === 'OWNER' && req.auth!.role !== 'OWNER') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only the business OWNER can assign the OWNER role.',
      })
    }

    const updated = await prisma.businessMembership.update({
      where: { id: membershipId },
      data: { roleId: targetRole.id },
    })

    return res.json({
      data: {
        membershipId: updated.id,
        userId: updated.userId,
        roleId: targetRole.id,
        roleName: targetRole.name,
      },
    })
  }
)
