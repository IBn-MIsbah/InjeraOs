import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateParams } from '../../middleware/validate-request.js'
import { authenticate } from './auth.middleware.js'
import { loginSchema, registerSchema, sessionIdParamsSchema, type LoginInput, type RegisterInput } from './auth.schema.js'
import { hashPassword, verifyPassword } from './auth.service.js'
import { clearAuthCookies, readCookie, REFRESH_COOKIE, setAuthCookies } from './cookies.js'
import {
  AppRole,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_DEFINITIONS,
} from './roles.constants.js'
import {
  createSession,
  revokeOtherSessions,
  revokeSessionFromRefreshToken,
  rotateSession,
} from './session.service.js'

export const authRouter: ExpressRouter = Router()

/**
 * Register a new user with email and password, and automatically
 * provision their business context and owner membership.
 */
authRouter.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const input = req.body as RegisterInput
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } })
  if (existingUser) {
    return res.status(409).json({ error: 'CONFLICT', message: 'User with this email already exists.' })
  }

  const hashedPassword = await hashPassword(input.password)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: hashedPassword,
      },
    })

    const business = await tx.business.create({
      data: {
        name: input.businessName ?? `${input.name}'s Business`,
        timezone: 'UTC',
        currency: 'ETB',
      },
    })

    // Preload system permissions to map codes to UUIDs for role templates
    const allPermissions = await tx.permission.findMany({
      select: { id: true, code: true },
    })
    const permissionCodeToId = new Map(allPermissions.map((p) => [p.code, p.id]))

    // Bootstrap standard bakery roles for this business
    let ownerRole: { id: string; name: string } | null = null

    for (const roleKey of Object.values(AppRole)) {
      const meta = ROLE_DEFINITIONS[roleKey]
      const createdRole = await tx.role.create({
        data: {
          businessId: business.id,
          name: meta.name,
          description: meta.description,
          isSystem: meta.isSystem,
        },
      })

      if (roleKey === AppRole.OWNER) {
        ownerRole = createdRole
      }

      const defaultPermCodes = DEFAULT_ROLE_PERMISSIONS[roleKey]
      if (!defaultPermCodes.includes('*')) {
        const rolePermData = defaultPermCodes
          .map((code) => permissionCodeToId.get(code))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({
            roleId: createdRole.id,
            permissionId,
          }))

        if (rolePermData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermData,
            skipDuplicates: true,
          })
        }
      }
    }

    if (!ownerRole) {
      throw new Error('Failed to initialize business owner role')
    }

    const membership = await tx.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        roleId: ownerRole.id,
        status: 'ACTIVE',
      },
    })

    return { user, business, membership, role: ownerRole }
  })

  const deviceKey =
    input.deviceKey ??
    req.header('x-device-id') ??
    randomUUID()
  const deviceName =
    input.deviceName ??
    req.header('x-device-name') ??
    req.get('user-agent')?.slice(0, 150) ??
    'Web Browser'

  const permissions = ['*']

  const session = await createSession({
    userId: result.user.id,
    businessId: result.business.id,
    membershipId: result.membership.id,
    role: result.role.name,
    permissions,
    deviceKey,
    deviceName,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  })

  setAuthCookies(res, session.accessToken, session.refreshToken, session.refreshMaxAgeMs)

  return res.status(201).json({
    data: {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
      },
      membershipId: result.membership.id,
      role: result.role.name,
      permissions,
      accessToken: session.accessToken,
    },
  })
})

/**
 * Log in using email and password, establishing an active session with tokens and cookies.
 */
authRouter.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const input = req.body as LoginInput

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' })
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash)
  if (!isValidPassword) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password.' })
  }

  const membership = await prisma.businessMembership.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      ...(input.businessId ? { businessId: input.businessId } : {}),
    },
  })

  if (!membership) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'No active business membership found for this user.',
    })
  }

  const role = await prisma.role.findUnique({
    where: { id: membership.roleId },
  })

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: membership.roleId },
  })

  const permissionRecords = rolePermissions.length
    ? await prisma.permission.findMany({
        where: { id: { in: rolePermissions.map((rp) => rp.permissionId) } },
        select: { code: true },
      })
    : []

  const permissions = role?.name === 'OWNER'
    ? ['*']
    : permissionRecords.map((p) => p.code)

  const deviceKey =
    input.deviceKey ??
    req.header('x-device-id') ??
    randomUUID()
  const deviceName =
    input.deviceName ??
    req.header('x-device-name') ??
    req.get('user-agent')?.slice(0, 150) ??
    'Web Browser'

  const session = await createSession({
    userId: user.id,
    businessId: membership.businessId,
    membershipId: membership.id,
    role: role?.name ?? undefined,
    permissions,
    deviceKey,
    deviceName,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  })

  setAuthCookies(res, session.accessToken, session.refreshToken, session.refreshMaxAgeMs)

  return res.status(200).json({
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      businessId: membership.businessId,
      membershipId: membership.id,
      role: role?.name ?? null,
      permissions,
      accessToken: session.accessToken,
    },
  })
})

/**
 * Rotate session: validates current refresh token cookie and issues a new access/refresh pair.
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const token = readCookie(req, REFRESH_COOKIE)
  const issued = token
    ? await rotateSession(token, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      })
    : null

  if (!issued) {
    clearAuthCookies(res)
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Refresh token is invalid, revoked, or expired.',
    })
  }

  setAuthCookies(res, issued.accessToken, issued.refreshToken, issued.refreshMaxAgeMs)
  return res.status(200).json({
    data: { accessToken: issued.accessToken },
  })
})

/**
 * Logout: revokes active session associated with current refresh token and clears auth cookies.
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = readCookie(req, REFRESH_COOKIE)
  if (token) {
    await revokeSessionFromRefreshToken(token)
  }
  clearAuthCookies(res)
  return res.status(204).end()
})

/**
 * Get current authenticated user context and session info.
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  })

  if (!user) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })
  }

  return res.json({
    data: {
      user,
      businessId: req.auth!.businessId,
      membershipId: req.auth!.membershipId,
      role: req.auth!.role,
      permissions: req.auth!.permissions,
      sessionId: req.auth!.sessionId,
    },
  })
})

/**
 * List all active sessions for the authenticated user and business.
 */
authRouter.get('/sessions', authenticate, async (req: Request, res: Response) => {
  const sessions = await prisma.authSession.findMany({
    where: {
      userId: req.auth!.userId,
      businessId: req.auth!.businessId,
      revokedAt: null,
    },
    select: {
      id: true,
      deviceId: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  })

  const data = sessions.map((s) => ({
    ...s,
    isCurrent: s.id === req.auth!.sessionId,
  }))

  return res.json({ data })
})

/**
 * Revoke all active sessions other than the current one.
 */
authRouter.post('/sessions/revoke-others', authenticate, async (req: Request, res: Response) => {
  if (!req.auth!.sessionId) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Current session ID could not be identified from token.',
    })
  }

  const result = await revokeOtherSessions(
    req.auth!.userId,
    req.auth!.businessId,
    req.auth!.sessionId
  )

  return res.json({
    data: {
      revokedCount: result.count,
    },
  })
})

/**
 * Revoke a specific active session.
 */
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  validateParams(sessionIdParamsSchema),
  async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string

    const result = await prisma.authSession.updateMany({
      where: {
        id: sessionId,
        userId: req.auth!.userId,
        businessId: req.auth!.businessId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: 'USER_REVOKED',
      },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Active session not found.' })
    }

    if (sessionId === req.auth!.sessionId) {
      clearAuthCookies(res)
    }

    return res.status(204).end()
  }
)

/**
 * Change authenticated user's password securely
 */
authRouter.post('/change-password', authenticate, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'New password must be at least 8 characters long.',
    })
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
  if (!user?.passwordHash) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Current password is incorrect.' })
  }

  const newHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  })

  return res.json({ message: 'Password updated successfully.' })
})
