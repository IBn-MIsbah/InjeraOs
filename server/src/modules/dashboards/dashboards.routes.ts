import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../auth/index.js'
import { validateBody } from '../../middleware/validate-request.js'
import {
  createDashboardLayoutSchema,
  updateDashboardLayoutSchema,
  type CreateDashboardLayoutInput,
  type UpdateDashboardLayoutInput,
} from './dashboards.schema.js'

export const dashboardsRouter: ExpressRouter = Router()

// All routes require authentication
dashboardsRouter.use(authenticate)

dashboardsRouter.get('/', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  const userId = req.auth?.userId

  if (!businessId || !userId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const layouts = await prisma.dashboardLayout.findMany({
    where: { businessId, userId },
    orderBy: { createdAt: 'desc' },
  })

  // Get widgets count for each layout
  const layoutIds = layouts.map((l) => l.id)
  const widgets =
    layoutIds.length > 0
      ? await prisma.dashboardWidget.findMany({
          where: { dashboardLayoutId: { in: layoutIds } },
        })
      : []

  const widgetMap: Record<string, number> = {}
  for (const w of widgets) {
    widgetMap[w.dashboardLayoutId] = (widgetMap[w.dashboardLayoutId] || 0) + 1
  }

  const result = layouts.map((l) => ({
    ...l,
    widgetCount: widgetMap[l.id] || 0,
  }))

  return res.status(200).json({ data: result })
})

dashboardsRouter.post(
  '/',
  validateBody(createDashboardLayoutSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const userId = req.auth?.userId

    if (!businessId || !userId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const { name, isDefault, widgets } = req.body as CreateDashboardLayoutInput

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        // unset existing default for this user
        await tx.dashboardLayout.updateMany({
          where: { businessId, userId, isDefault: true },
          data: { isDefault: false },
        })
      }

      const layout = await tx.dashboardLayout.create({
        data: {
          businessId,
          userId,
          name,
          isDefault: isDefault || false,
        },
      })

      const createdWidgets = []
      if (widgets && widgets.length > 0) {
        for (const w of widgets) {
          const widget = await tx.dashboardWidget.create({
            data: {
              dashboardLayoutId: layout.id,
              widgetType: w.widgetType,
              title: w.title,
              positionX: w.positionX,
              positionY: w.positionY,
              width: w.width,
              height: w.height,
              configuration: w.configuration || {},
            },
          })
          createdWidgets.push(widget)
        }
      }

      return { layout, widgets: createdWidgets }
    })

    return res.status(201).json({
      message: 'Dashboard layout created successfully',
      data: {
        ...result.layout,
        widgets: result.widgets,
      },
    })
  }
)

dashboardsRouter.get('/:id', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  const userId = req.auth?.userId
  const id = String(req.params.id)

  if (!businessId || !userId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const layout = await prisma.dashboardLayout.findFirst({
    where: { id, businessId, userId },
  })

  if (!layout) {
    return res.status(404).json({ message: 'Dashboard layout not found' })
  }

  const widgets = await prisma.dashboardWidget.findMany({
    where: { dashboardLayoutId: layout.id },
    orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
  })

  return res.status(200).json({
    data: {
      ...layout,
      widgets,
    },
  })
})

dashboardsRouter.put(
  '/:id',
  validateBody(updateDashboardLayoutSchema),
  async (req: Request, res: Response) => {
    const businessId = req.auth?.businessId
    const userId = req.auth?.userId
    const id = String(req.params.id)

    if (!businessId || !userId) {
      return res.status(401).json({ message: 'Unauthorized business context' })
    }

    const layout = await prisma.dashboardLayout.findFirst({
      where: { id, businessId, userId },
    })

    if (!layout) {
      return res.status(404).json({ message: 'Dashboard layout not found' })
    }

    const { name, isDefault, widgets } = req.body as UpdateDashboardLayoutInput

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.dashboardLayout.updateMany({
          where: { businessId, userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      const updatedLayout = await tx.dashboardLayout.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(isDefault !== undefined ? { isDefault } : {}),
        },
      })

      let updatedWidgets: any[] = []

      if (widgets !== undefined) {
        // Replace widgets
        await tx.dashboardWidget.deleteMany({
          where: { dashboardLayoutId: id },
        })

        for (const w of widgets) {
          const widget = await tx.dashboardWidget.create({
            data: {
              dashboardLayoutId: id,
              widgetType: w.widgetType,
              title: w.title,
              positionX: w.positionX,
              positionY: w.positionY,
              width: w.width,
              height: w.height,
              configuration: w.configuration || {},
            },
          })
          updatedWidgets.push(widget)
        }
      } else {
        updatedWidgets = await tx.dashboardWidget.findMany({
          where: { dashboardLayoutId: id },
          orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
        })
      }

      return { layout: updatedLayout, widgets: updatedWidgets }
    })

    return res.status(200).json({
      message: 'Dashboard layout updated successfully',
      data: {
        ...result.layout,
        widgets: result.widgets,
      },
    })
  }
)

dashboardsRouter.delete('/:id', async (req: Request, res: Response) => {
  const businessId = req.auth?.businessId
  const userId = req.auth?.userId
  const id = String(req.params.id)

  if (!businessId || !userId) {
    return res.status(401).json({ message: 'Unauthorized business context' })
  }

  const layout = await prisma.dashboardLayout.findFirst({
    where: { id, businessId, userId },
  })

  if (!layout) {
    return res.status(404).json({ message: 'Dashboard layout not found' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.dashboardWidget.deleteMany({
      where: { dashboardLayoutId: id },
    })
    await tx.dashboardLayout.delete({
      where: { id },
    })
  })

  return res.status(200).json({
    message: 'Dashboard layout and widgets deleted successfully',
  })
})
