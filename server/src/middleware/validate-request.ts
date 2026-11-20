import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

export const validateBody = <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request body validation failed.',
        details: result.error.issues,
      })
      return
    }

    req.body = result.data
    next()
  }

export const validateParams = <T extends Record<string, unknown>>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Route parameter validation failed.',
        details: result.error.issues,
      })
      return
    }

    Object.assign(req.params, result.data)
    next()
  }

export const validateQuery = <T extends Record<string, unknown>>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Query parameter validation failed.',
        details: result.error.issues,
      })
      return
    }

    req.query = result.data as any
    next()
  }
