import { z } from 'zod'

export const updateSystemSettingsSchema = z.object({
  employeeNumberPrefix: z.string().min(1).max(10).optional(),
  minQualityYieldPercent: z.number().min(50).max(100).optional(),
  tokenSessionDurationMinutes: z.number().min(15).max(10080).optional(),
  maintenanceMode: z.boolean().optional(),
  autoSyncIntervalSeconds: z.number().min(5).max(3600).optional(),
  enforceShiftClockInGraceMinutes: z.number().min(0).max(120).optional(),
  allowOfflineTransactions: z.boolean().optional(),
  currency: z.string().min(1).max(5).optional(),
  timezone: z.string().min(1).max(100).optional(),
  dateCalendar: z.enum(['GREGORIAN', 'ETHIOPIAN']).optional(),
})

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>

export interface SystemSettings {
  businessId: string
  employeeNumberPrefix: string
  minQualityYieldPercent: number
  tokenSessionDurationMinutes: number
  maintenanceMode: boolean
  autoSyncIntervalSeconds: number
  enforceShiftClockInGraceMinutes: number
  allowOfflineTransactions: boolean
  currency: string
  timezone: string
  dateCalendar: 'GREGORIAN' | 'ETHIOPIAN'
  updatedAt: string
}
