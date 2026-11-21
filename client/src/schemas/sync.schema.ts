import { z } from 'zod'

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

export type SyncOperationEnvelopeInput = z.infer<typeof syncOperationEnvelopeSchema>

export const syncBatchSchema = z.object({
  deviceId: z.string().uuid().optional(),
  operations: z.array(syncOperationEnvelopeSchema).min(1).max(100),
})

export type SyncBatchInput = z.infer<typeof syncBatchSchema>

export const resolveConflictSchema = z.object({
  strategy: z.enum(['OVERWRITE', 'DISCARD', 'ADJUST', 'REJECT']),
  resolutionNotes: z.string().trim().max(500).optional(),
  adjustedPayload: z.record(z.string(), z.any()).optional(),
})

export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>
