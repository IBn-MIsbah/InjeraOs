import { prisma } from '../../lib/prisma.js'
import type { SystemSettings, UpdateSystemSettingsInput } from './system.schema.js'

// In-memory operational parameters keyed by businessId
const businessSettingsStore = new Map<string, Partial<SystemSettings>>()

export const getSystemSettings = async (businessId: string): Promise<SystemSettings> => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { currency: true, timezone: true, dateCalendar: true },
  })

  const stored = businessSettingsStore.get(businessId) || {}

  return {
    businessId,
    employeeNumberPrefix: stored.employeeNumberPrefix ?? 'EMP',
    minQualityYieldPercent: stored.minQualityYieldPercent ?? 85,
    tokenSessionDurationMinutes: stored.tokenSessionDurationMinutes ?? 480,
    maintenanceMode: stored.maintenanceMode ?? false,
    autoSyncIntervalSeconds: stored.autoSyncIntervalSeconds ?? 30,
    enforceShiftClockInGraceMinutes: stored.enforceShiftClockInGraceMinutes ?? 15,
    allowOfflineTransactions: stored.allowOfflineTransactions ?? true,
    currency: business?.currency ?? stored.currency ?? 'ETB',
    timezone: business?.timezone ?? stored.timezone ?? 'Africa/Addis_Ababa',
    dateCalendar: (business?.dateCalendar as 'GREGORIAN' | 'ETHIOPIAN') ?? stored.dateCalendar ?? 'ETHIOPIAN',
    updatedAt: stored.updatedAt ?? new Date().toISOString(),
  }
}

export const updateSystemSettings = async (
  businessId: string,
  input: UpdateSystemSettingsInput
): Promise<SystemSettings> => {
  const current = await getSystemSettings(businessId)

  // Update business table fields if modified
  const businessUpdates: { currency?: string; timezone?: string; dateCalendar?: 'GREGORIAN' | 'ETHIOPIAN' } = {}
  if (input.currency && input.currency !== current.currency) {
    businessUpdates.currency = input.currency
  }
  if (input.timezone && input.timezone !== current.timezone) {
    businessUpdates.timezone = input.timezone
  }
  if (input.dateCalendar && input.dateCalendar !== current.dateCalendar) {
    businessUpdates.dateCalendar = input.dateCalendar
  }

  if (Object.keys(businessUpdates).length > 0) {
    await prisma.business.update({
      where: { id: businessId },
      data: businessUpdates,
    })
  }

  const updated: SystemSettings = {
    ...current,
    ...input,
    businessId,
    updatedAt: new Date().toISOString(),
  }

  businessSettingsStore.set(businessId, updated)
  return updated
}
