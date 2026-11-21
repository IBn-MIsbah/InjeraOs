import { z } from 'zod'

export const dashboardWidgetSchema = z.object({
  widgetType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(150),
  positionX: z.number().int().nonnegative(),
  positionY: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  configuration: z.record(z.string(), z.any()).default({}),
})

export type DashboardWidgetInput = z.infer<typeof dashboardWidgetSchema>

export const createDashboardLayoutSchema = z.object({
  name: z.string().trim().min(1, 'Layout name is required').max(100),
  isDefault: z.boolean().default(false),
  widgets: z.array(dashboardWidgetSchema).default([]),
})

export type CreateDashboardLayoutInput = z.infer<typeof createDashboardLayoutSchema>

export const updateDashboardLayoutSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  widgets: z.array(dashboardWidgetSchema).optional(),
})

export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>
