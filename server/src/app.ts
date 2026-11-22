import express, { type Express } from 'express'
import path from 'path'
import fs from 'fs'
import { prisma } from './lib/prisma.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/request-logger.js'
import { authRouter } from './modules/auth/index.js'
import { branchRouter, businessRouter } from './modules/business/index.js'
import { roleRouter } from './modules/roles/index.js'
import { userRouter } from './modules/users/index.js'
import { workforceRouter } from './modules/workforce/index.js'
import { materialsRouter } from './modules/materials/index.js'
import { recipesRouter } from './modules/recipes/index.js'
import { productionRouter } from './modules/production/index.js'
import { costingRouter } from './modules/costing/index.js'
import { inventoryRouter } from './modules/inventory/index.js'
import { salesRouter } from './modules/sales/index.js'
import { expensesRouter } from './modules/expenses/index.js'
import { reportsRouter } from './modules/reports/index.js'
import { dashboardsRouter } from './modules/dashboards/index.js'
import { syncRouter } from './modules/sync/index.js'
import { systemRouter } from './modules/system/index.js'
import { auditRouter } from './modules/audit/index.js'

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')

  // Trust upstream reverse proxies (Nginx, Caddy, Cloudflare, AWS ALB)
  app.set('trust proxy', 1)

  // Security headers middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
  })

  // Structured HTTP request logging
  app.use(requestLogger)

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false }))

  // CORS headers
  app.use((req, res, next) => {
    const origin = req.header('origin')
    const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
    if (origin === clientOrigin || !origin) {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin)
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Device-Id, X-Device-Name, X-Request-Id'
      )
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // Health check endpoint with deep database reachability probing
  app.get(['/health', '/healthz'], async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
      })
    } catch (err: unknown) {
      res.status(503).json({
        status: 'degraded',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
        },
        error: err instanceof Error ? err.message : 'Database ping failed',
      })
    }
  })

  // Client Static Files (in Production if present)
  const clientDistPath = process.env.CLIENT_DIST_PATH ?? path.resolve(process.cwd(), '../client/dist')
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, { index: false }))
  }

  // API Modules
  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/roles', roleRouter)
  app.use('/api/business', businessRouter)
  app.use('/api/branches', branchRouter)
  app.use('/api/workforce', workforceRouter)
  app.use('/api/materials', materialsRouter)
  app.use('/api/recipes', recipesRouter)
  app.use('/api/production', productionRouter)
  app.use('/api/costing', costingRouter)
  app.use('/api/inventory', inventoryRouter)
  app.use('/api/sales', salesRouter)
  app.use('/api/expenses', expensesRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/dashboards', dashboardsRouter)
  app.use('/api/sync', syncRouter)
  app.use('/api/system', systemRouter)
  app.use('/api/audit-logs', auditRouter)

  // SPA Fallback for client routes in Production
  if (fs.existsSync(clientDistPath)) {
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        return res.sendFile(path.join(clientDistPath, 'index.html'))
      }
      next()
    })
  }

  // 404 Route Not Found for unmatched API calls
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      ...(req.id ? { requestId: req.id } : {}),
    })
  })

  // Centralized Error Handler
  app.use(errorHandler)

  return app
}

export const app: Express = createApp()
