import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { signAccessToken } from './auth.service.js'
import type { AccessTokenPayload } from './auth.types.js'

const ttlMs = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86_400_000
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const makeRefreshToken = (id: string) => `${id}.${randomBytes(48).toString('base64url')}`

export type SessionContext = AccessTokenPayload & {
  deviceKey: string
  deviceName: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export type IssuedSession = {
  accessToken: string
  refreshToken: string
  refreshMaxAgeMs: number
}

export type RotationMetadata = {
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export const createSession = async (context: SessionContext): Promise<IssuedSession> => {
  const device = await prisma.device.upsert({
    where: {
      businessId_userId_deviceKey: {
        businessId: context.businessId,
        userId: context.userId,
        deviceKey: context.deviceKey,
      },
    },
    create: {
      businessId: context.businessId,
      userId: context.userId,
      deviceKey: context.deviceKey,
      deviceName: context.deviceName,
      lastSeenAt: new Date(),
    },
    update: {
      deviceName: context.deviceName,
      lastSeenAt: new Date(),
      status: 'ACTIVE',
    },
  })

  const id = randomUUID()
  const refreshToken = makeRefreshToken(id)

  await prisma.authSession.create({
    data: {
      id,
      userId: context.userId,
      businessId: context.businessId,
      deviceId: device.id,
      tokenFamilyId: randomUUID(),
      refreshTokenHash: digest(refreshToken),
      role: context.role ?? null,
      permissions: context.permissions,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })

  return {
    accessToken: signAccessToken({ ...context, sessionId: id }),
    refreshToken,
    refreshMaxAgeMs: ttlMs,
  }
}

export const rotateSession = async (
  refreshToken: string,
  metadata?: RotationMetadata
): Promise<IssuedSession | null> => {
  const [id] = refreshToken.split('.')
  if (!id) return null

  const session = await prisma.authSession.findUnique({ where: { id } })
  if (!session) return null

  // If session is already revoked or token hash doesn't match, trigger token reuse detection
  const incomingHash = digest(refreshToken)
  if (session.revokedAt || session.refreshTokenHash !== incomingHash) {
    await prisma.authSession.updateMany({
      where: { tokenFamilyId: session.tokenFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'TOKEN_REUSE_DETECTED' },
    })
    return null
  }

  if (session.expiresAt <= new Date()) {
    return null
  }

  const nextRefreshToken = makeRefreshToken(id)
  const result = await prisma.authSession.updateMany({
    where: { id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
    data: {
      refreshTokenHash: digest(nextRefreshToken),
      lastUsedAt: new Date(),
      ...(metadata?.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
      ...(metadata?.userAgent ? { userAgent: metadata.userAgent } : {}),
    },
  })

  if (result.count !== 1) return null

  await prisma.device.update({
    where: { id: session.deviceId },
    data: { lastSeenAt: new Date(), status: 'ACTIVE' },
  })

  const permissions = Array.isArray(session.permissions)
    ? session.permissions.filter((value): value is string => typeof value === 'string')
    : []

  const tokenPayload: AccessTokenPayload = {
    userId: session.userId,
    businessId: session.businessId,
    sessionId: session.id,
    permissions,
  }
  if (session.role) {
    tokenPayload.role = session.role
  }

  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: nextRefreshToken,
    refreshMaxAgeMs: Math.max(0, session.expiresAt.getTime() - Date.now()),
  }
}

export const revokeSessionFromRefreshToken = async (token: string) => {
  const [id] = token.split('.')
  if (!id) return null
  return prisma.authSession.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: 'LOGOUT' },
  })
}

export const revokeOtherSessions = async (
  userId: string,
  businessId: string,
  currentSessionId: string
) => {
  return prisma.authSession.updateMany({
    where: {
      userId,
      businessId,
      id: { not: currentSessionId },
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokeReason: 'USER_REVOKED_OTHERS',
    },
  })
}
