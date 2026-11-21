import { z } from 'zod'

// 1. Sync Operation Envelope Schema
export const syncOperationEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  deviceId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(1).max(150),
  operationType: z.string().trim().min(1).max(100),
  schemaVersion: z.number().int().positive().default(1),
  payload: z.record(z.string(), z.any()),
  clientTimestamp: z.string().datetime(),
  operationalDate: z.string().optional(),
})

export type SyncOperationEnvelope = z.infer<typeof syncOperationEnvelopeSchema>

// 2. Batch Sync Request Schema
export const syncBatchSchema = z.object({
  deviceId: z.string().uuid().optional(),
  operations: z.array(syncOperationEnvelopeSchema).min(1).max(100),
})

export type SyncBatchInput = z.infer<typeof syncBatchSchema>

// 3. Status Query Schema
export const syncStatusQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  idempotencyKeys: z.string().optional(), // Comma-separated keys
  status: z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CONFLICT']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type SyncStatusQuery = z.infer<typeof syncStatusQuerySchema>

// 4. Conflicts Query Schema
export const syncConflictsQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'REJECTED']).optional().default('OPEN'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type SyncConflictsQuery = z.infer<typeof syncConflictsQuerySchema>

// 5. Conflict Resolution Schema
export const resolveConflictSchema = z.object({
  strategy: z.enum(['OVERWRITE', 'DISCARD', 'ADJUST', 'REJECT']),
  resolutionNotes: z.string().trim().max(500).optional(),
  adjustedPayload: z.record(z.string(), z.any()).optional(),
})

export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>
