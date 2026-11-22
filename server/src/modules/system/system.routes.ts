import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireRole } from '../auth/index.js'
import { validateBody } from '../../middleware/validate-request.js'
import { getSystemSettings, updateSystemSettings } from './system.service.js'
import { updateSystemSettingsSchema, type UpdateSystemSettingsInput } from './system.schema.js'

export const systemRouter: ExpressRouter = Router()

// All system endpoints require authentication and OWNER or ADMIN role
systemRouter.use(authenticate)
systemRouter.use(requireRole('OWNER', 'ADMIN'))

/**
 * GET /api/system/status
 * Realtime system diagnostic telemetry: DB latency, memory, uptime, offline sync queue, active sessions
 */
systemRouter.get('/status', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  // Test database connection & measure latency
  const dbStart = performance.now()
  let dbStatus: 'CONNECTED' | 'DISCONNECTED' = 'CONNECTED'
  let dbLatencyMs = 0
  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Math.round(performance.now() - dbStart)
  } catch {
    dbStatus = 'DISCONNECTED'
    dbLatencyMs = -1
  }

  // Memory usage
  const mem = process.memoryUsage()
  const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100
  const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100
  const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100
  const externalMb = Math.round((mem.external / 1024 / 1024) * 100) / 100
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100)

  // System uptime
  const uptimeSeconds = Math.floor(process.uptime())
  const days = Math.floor(uptimeSeconds / (3600 * 24))
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const seconds = uptimeSeconds % 60
  const formattedUptime = days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${seconds}s`

  // Offline sync & conflicts telemetry
  const [pendingOps, openConflicts, activeSessions, activeDevices, business] = await Promise.all([
    prisma.syncOperation.count({
      where: { businessId, syncStatus: 'PENDING' },
    }),
    prisma.syncConflict.count({
      where: { businessId, status: 'OPEN' },
    }),
    prisma.authSession.count({
      where: { businessId, revokedAt: null },
    }),
    prisma.device.count({
      where: { businessId, status: 'ACTIVE' },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, status: true },
    }),
  ])

  const settings = await getSystemSettings(businessId)

  const overallHealth =
    settings.maintenanceMode
      ? 'MAINTENANCE'
      : dbStatus === 'CONNECTED' && openConflicts === 0
        ? 'HEALTHY'
        : 'DEGRADED'

  return res.json({
    data: {
      health: overallHealth,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'PostgreSQL 16 (Relational Engine)',
        poolStatus: 'READY',
      },
      runtime: {
        uptimeSeconds,
        uptimeFormatted: formattedUptime,
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'production',
        architecture: process.arch,
      },
      memory: {
        heapUsedMb,
        heapTotalMb,
        rssMb,
        externalMb,
        usagePercent: heapPercent,
      },
      syncEngine: {
        pendingOperations: pendingOps,
        openConflicts,
        status: pendingOps > 0 ? 'SYNCHRONIZING' : 'SYNCHRONIZED',
        autoSyncIntervalSeconds: settings.autoSyncIntervalSeconds,
      },
      security: {
        activeUserSessions: activeSessions,
        registeredDevices: activeDevices,
        cookieMode: 'HttpOnly Secure SameSite=Lax',
        sessionDurationMinutes: settings.tokenSessionDurationMinutes,
      },
      business: {
        id: businessId,
        name: business?.name ?? 'KD PLC',
        status: business?.status ?? 'ACTIVE',
      },
      timestamp: new Date().toISOString(),
    },
  })
})

/**
 * GET /api/system/settings
 * Read current operational parameters & tweaks
 */
systemRouter.get('/settings', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const settings = await getSystemSettings(businessId)
  return res.json({ data: settings })
})

/**
 * PATCH /api/system/settings
 * Update operational parameters and record an audit log
 */
systemRouter.patch(
  '/settings',
  validateBody(updateSystemSettingsSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth!.businessId
    const actorId = req.auth!.userId
    const input = req.body as UpdateSystemSettingsInput

    const beforeData = await getSystemSettings(businessId)
    const updated = await updateSystemSettings(businessId, input)

    // Automatically record an AuditLog
    await prisma.auditLog.create({
      data: {
        businessId,
        actorId,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityType: 'SYSTEM_SETTINGS',
        entityId: businessId,
        source: 'WEB',
        beforeData: beforeData as any,
        afterData: updated as any,
        reason: 'Administrator updated system operational configuration',
      },
    })

    return res.json({
      data: updated,
      message: 'System parameters updated successfully',
    })
  }
)
