import { Router, type Request, type Response, type Router as ExpressRouter } from 'express'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateParams } from '../../middleware/validate-request.js'
import { authenticate, requirePermissions, requireRole } from '../auth/index.js'
import { createUserSchema, updateUserSchema, userIdParamsSchema } from './user.schema.js'
import type { CreateUserInput, UpdateUserInput } from './user.types.js'

export const userRouter: ExpressRouter = Router()

const toUserUpdateData = (input: UpdateUserInput) => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.phone !== undefined ? { phone: input.phone } : {}),
})

// Authentication is deliberately applied at the router boundary: no user endpoint is public.
userRouter.use(authenticate)

userRouter.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
  })
  if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })
  return res.json({ data: user })
})

userRouter.get('/', requirePermissions('user.read'), async (_req: Request, res: Response) => {
  const memberships = await prisma.businessMembership.findMany({
    where: { businessId: _req.auth!.businessId, status: 'ACTIVE' },
    select: { userId: true },
  })
  const users = await prisma.user.findMany({
    where: { id: { in: memberships.map(({ userId }) => userId) } },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return res.json({ data: users })
})

userRouter.get(
  '/:userId',
  requirePermissions('user.read'),
  validateParams(userIdParamsSchema),
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string
    const membership = await prisma.businessMembership.findFirst({
      where: { businessId: req.auth!.businessId, userId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!membership) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true },
    })
    if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })
    return res.json({ data: user })
  }
)

userRouter.post(
  '/',
  requireRole('OWNER', 'ADMIN'),
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
    const input = req.body as CreateUserInput
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
    })
    return res.status(201).json({ data: user })
  }
)

userRouter.patch('/me', validateBody(updateUserSchema), async (req: Request, res: Response) => {
  const input = req.body as UpdateUserInput
  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: toUserUpdateData(input),
  })
  return res.json({ data: user })
})

userRouter.patch(
  '/:userId',
  requireRole('OWNER', 'ADMIN'),
  validateParams(userIdParamsSchema),
  validateBody(updateUserSchema),
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string
    const membership = await prisma.businessMembership.findFirst({
      where: { businessId: req.auth!.businessId, userId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!membership) return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' })

    const input = req.body as UpdateUserInput
    const user = await prisma.user.update({
      where: { id: userId },
      data: toUserUpdateData(input),
    })
    return res.json({ data: user })
  }
)
