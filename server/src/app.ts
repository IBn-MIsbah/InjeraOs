import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { authRouter } from './modules/auth/index.js'
import { userRouter } from './modules/users/index.js'

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false }))
  app.use((req, res, next) => {
    const origin = req.header('origin')
    const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
    if (origin === clientOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-Device-Name')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' }))

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error)
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' })
  })

  return app
}

export const app: Express = createApp()
