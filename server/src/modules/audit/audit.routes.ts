import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate, requireRole } from '../auth/index.js'
import type { AuditSource } from '../../generated/prisma/index.js'

export const auditRouter: ExpressRouter = Router()

// All audit trail endpoints require authentication and OWNER or ADMIN role
auditRouter.use(authenticate)
auditRouter.use(requireRole('OWNER', 'ADMIN'))

/**
 * GET /api/audit-logs
 * Retrieves business audit trail entries with pagination, action & entity filtering
 */
auditRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10)))
  const action = req.query.action ? String(req.query.action).trim() : undefined
  const entityType = req.query.entityType ? String(req.query.entityType).trim() : undefined
  const source = req.query.source ? String(req.query.source).trim() : undefined

  const where: any = {
    businessId,
  }

  if (action) {
    where.action = { contains: action, mode: 'insensitive' }
  }
  if (entityType) {
    where.entityType = { equals: entityType }
  }
  if (source && ['WEB', 'MOBILE', 'OFFLINE_SYNC', 'SYSTEM'].includes(source)) {
    where.source = source as AuditSource
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // Enrich logs with user information (name & email)
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[]
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : []

  const actorMap = new Map(actors.map((a) => [a.id, a]))

  const data = logs.map((log) => ({
    ...log,
    actor: log.actorId
      ? actorMap.get(log.actorId) ?? { id: log.actorId, name: 'User', email: '' }
      : { id: 'system', name: 'System Automation', email: 'system@injeraos.internal' },
  }))

  return res.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  })
})

/**
 * POST /api/audit-logs
 * Manually or programmatically append an audit log entry
 */
auditRouter.post('/', async (req: Request, res: Response) => {
  const businessId = req.auth!.businessId
  const actorId = req.auth!.userId
  const { action, entityType, entityId, beforeData, afterData, reason, source } = req.body

  if (!action || !entityType) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Action and entityType are required.' })
  }

  const log = await prisma.auditLog.create({
    data: {
      businessId,
      actorId,
      action: String(action),
      entityType: String(entityType),
      entityId: entityId || businessId,
      beforeData: beforeData ?? undefined,
      afterData: afterData ?? undefined,
      reason: reason ? String(reason) : undefined,
      source: (source && ['WEB', 'MOBILE', 'OFFLINE_SYNC', 'SYSTEM'].includes(source))
        ? source as AuditSource
        : 'WEB',
    },
  })

  return res.status(201).json({ data: log })
})
