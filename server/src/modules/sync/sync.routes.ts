import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../auth/index.js'
import { validateBody, validateQuery } from '../../middleware/validate-request.js'
import {
  syncBatchSchema,
  syncStatusQuerySchema,
  syncConflictsQuerySchema,
  resolveConflictSchema,
  type SyncBatchInput,
  type SyncStatusQuery,
  type SyncConflictsQuery,
  type ResolveConflictInput,
} from './sync.schema.js'
import { syncService } from './sync.service.js'

export const syncRouter: ExpressRouter = Router()

// All sync routes require authenticated session
syncRouter.use(authenticate)

/**
 * POST /api/sync/batch
 * Process a batch of offline operations idempotently.
 */
syncRouter.post(
  '/batch',
  validateBody(syncBatchSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const userId = req.auth?.userId

    if (!businessId || !userId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { operations, deviceId } = req.body as SyncBatchInput
    const resolvedDeviceId = deviceId || (req.headers['x-device-id'] as string) || userId

    const batchSummary = await syncService.processBatch(
      businessId,
      resolvedDeviceId,
      userId,
      operations
    )

    return res.status(200).json({
      message: 'Batch synchronization completed',
      data: batchSummary,
    })
  }
)

/**
 * GET /api/sync/status
 * Check sync status for operations by deviceId or idempotency keys.
 */
syncRouter.get(
  '/status',
  validateQuery(syncStatusQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const query = req.query as unknown as SyncStatusQuery
    const keys = query.idempotencyKeys
      ? query.idempotencyKeys.split(',').map((k) => k.trim()).filter(Boolean)
      : undefined

    const operations = await prisma.syncOperation.findMany({
      where: {
        businessId,
        ...(query.deviceId ? { deviceId: query.deviceId } : {}),
        ...(query.status ? { syncStatus: query.status } : {}),
        ...(keys && keys.length > 0 ? { idempotencyKey: { in: keys } } : {}),
      },
      orderBy: { clientTimestamp: 'desc' },
      take: query.limit || 50,
    })

    return res.status(200).json({ data: operations })
  }
)

/**
 * GET /api/sync/conflicts
 * List open or resolved sync conflicts.
 */
syncRouter.get(
  '/conflicts',
  validateQuery(syncConflictsQuerySchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    if (!businessId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const query = req.query as unknown as SyncConflictsQuery

    const conflicts = await prisma.syncConflict.findMany({
      where: {
        businessId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { id: 'desc' },
      take: query.limit || 50,
    })

    return res.status(200).json({ data: conflicts })
  }
)

/**
 * POST /api/sync/conflicts/:id/resolve
 * Resolve a sync conflict (DISCARD, OVERWRITE, or ADJUST).
 */
syncRouter.post(
  '/conflicts/:id/resolve',
  validateBody(resolveConflictSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const userId = req.auth?.userId

    if (!businessId || !userId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const conflictId = String(req.params.id)
    const input = req.body as ResolveConflictInput

    try {
      const result = await syncService.resolveConflict(businessId, conflictId, userId, input)
      return res.status(200).json({
        message: 'Conflict resolved successfully',
        data: result,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve conflict'
      return res.status(400).json({ message })
    }
  }
)
