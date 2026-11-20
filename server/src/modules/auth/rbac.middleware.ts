import type { NextFunction, Request, Response } from 'express'
import type { AuthenticatedUser } from './auth.types.js'

const unauthorized = (res: Response, message: string) =>
  res.status(401).json({ error: 'UNAUTHORIZED', message })

const forbidden = (res: Response, message: string) =>
  res.status(403).json({ error: 'FORBIDDEN', message })

const hasRole = (auth: AuthenticatedUser, roles: readonly string[]) =>
  Boolean(auth.role && roles.includes(auth.role))

/** Requires a valid identity (normally supplied by `authenticate`) with one role. */
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res, 'Authentication is required.')
      return
    }
    if (!hasRole(req.auth, roles)) {
      forbidden(res, 'Your role is not permitted to perform this action.')
      return
    }
    next()
  }

/** Requires every named permission (conjunction / AND). */
export const requirePermissions = (...permissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res, 'Authentication is required.')
      return
    }
    const userPermissions = new Set(req.auth.permissions)
    const hasAll = permissions.every(
      (permission) => userPermissions.has(permission) || userPermissions.has('*')
    )
    if (!hasAll) {
      forbidden(res, 'You do not have the required permission.')
      return
    }
    next()
  }

/** Requires at least one of the named permissions (disjunction / OR). */
export const requireAnyPermission = (...permissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res, 'Authentication is required.')
      return
    }
    const userPermissions = new Set(req.auth.permissions)
    const hasAny = permissions.some(
      (permission) => userPermissions.has(permission) || userPermissions.has('*')
    )
    if (!hasAny) {
      forbidden(res, 'You do not have any of the required permissions.')
      return
    }
    next()
  }

/** Prevents a request from selecting data outside the business encoded in its token. */
export const requireBusinessScope = (param = 'businessId') =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res, 'Authentication is required.')
      return
    }

    const requestedBusinessId =
      req.params[param] ??
      (typeof req.query[param] === 'string' ? req.query[param] : undefined) ??
      (req.body && typeof req.body === 'object' && typeof req.body[param] === 'string'
        ? req.body[param]
        : undefined)

    if (requestedBusinessId && requestedBusinessId !== req.auth.businessId) {
      forbidden(res, 'Cross-business access is not allowed.')
      return
    }
    next()
  }
