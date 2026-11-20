import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pinoHttp } from 'pino-http'
import { logger } from '../lib/logger.js'

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => {
    const existingId = req.headers['x-request-id']
    if (typeof existingId === 'string' && existingId.trim()) {
      return existingId
    }
    return randomUUID()
  },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) => {
    return `${req.method} ${req.url} -> ${res.statusCode} in ${Math.round(responseTime)}ms`
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
    return `${req.method} ${req.url} -> ${res.statusCode} ERROR: ${err.message}`
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: (req.raw as any)?.query,
      remoteAddress: req.remoteAddress,
      userAgent: req.headers['user-agent'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
})
