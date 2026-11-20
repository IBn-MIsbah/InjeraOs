import 'dotenv/config'
import { app } from './app.js'
import { logger } from './lib/logger.js'

const port = Number(process.env.PORT ?? 3000)
const server = app.listen(port, () => {
  logger.info({ port, env: process.env.NODE_ENV ?? 'development' }, `API server listening on port ${port}`)
})

// Process-level unhandled rejection tracking
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ err: reason }, 'Unhandled Rejection detected at process level')
})

// Process-level uncaught exception tracking
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught Exception detected at process level')
  process.exit(1)
})

const shutdown = (signal: string) => {
  logger.info({ signal }, `${signal} received; starting graceful shutdown`)
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error during server shutdown')
      process.exitCode = 1
    } else {
      logger.info('Server closed successfully')
    }
    process.exit()
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
