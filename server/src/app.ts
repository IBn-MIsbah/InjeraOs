import express, { type Express } from 'express'
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

export const createApp = (): Express => {
  const app = express()

  app.disable('x-powered-by')

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

  // Health check endpoint
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

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

  // 404 Route Not Found
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
