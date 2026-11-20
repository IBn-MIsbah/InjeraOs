import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.id ?? (req.headers['x-request-id'] as string) ?? undefined

  // 1. Operational application errors (AppError)
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(
        { err: error, requestId, userId: req.auth?.userId, path: req.path },
        `[${error.code}] ${error.message}`
      )
    } else {
      logger.warn(
        { requestId, code: error.code, details: error.details, path: req.path },
        `[${error.code}] ${error.message}`
      )
    }

    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
      ...(requestId ? { requestId } : {}),
    })
    return
  }

  // 2. Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({ requestId, issues: error.issues, path: req.path }, 'Validation failed')
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request payload validation failed.',
      details: error.issues,
      ...(requestId ? { requestId } : {}),
    })
    return
  }

  // 3. JSON body parsing error
  if (error instanceof SyntaxError && 'status' in error && error.status === 400 && 'body' in error) {
    logger.warn({ requestId, path: req.path }, 'Malformed JSON in request body')
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Malformed JSON payload.',
      ...(requestId ? { requestId } : {}),
    })
    return
  }

  // 4. Prisma known database errors
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const prismaCode = (error as any).code
    if (prismaCode === 'P2002') {
      logger.warn({ requestId, target: (error as any).meta?.target }, 'Unique constraint violation')
      res.status(409).json({
        error: 'CONFLICT',
        message: 'A record with this unique identifier already exists.',
        ...(requestId ? { requestId } : {}),
      })
      return
    }
    if (prismaCode === 'P2025') {
      logger.warn({ requestId }, 'Record not found in database')
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'The requested record does not exist.',
        ...(requestId ? { requestId } : {}),
      })
      return
    }
  }

  // 5. Unhandled / Unexpected server crash
  const err = error instanceof Error ? error : new Error(String(error))
  logger.error(
    {
      err,
      requestId,
      userId: req.auth?.userId,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
    },
    `Unhandled Exception: ${err.message}`
  )

  const isProduction = process.env.NODE_ENV === 'production'
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'An unexpected server error occurred.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
    ...(requestId ? { requestId } : {}),
  })
}
