import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../../lib/prisma.js'
import { verifyAccessToken } from './auth.service.js'
import { ACCESS_COOKIE, readCookie } from './cookies.js'

const unauthorized = (res: Response, message: string) =>
  res.status(401).json({ error: 'UNAUTHORIZED', message })

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const [scheme, bearerToken] = req.header('authorization')?.split(' ') ?? []
  const token = readCookie(req, ACCESS_COOKIE) ?? (scheme === 'Bearer' ? bearerToken : undefined)

  if (!token) {
    unauthorized(res, 'An access token is required.')
    return
  }

  try {
    const payload = verifyAccessToken(token)

    // Verify session revocation state if token carries a sessionId
    if (payload.sessionId) {
      const session = await prisma.authSession.findUnique({
        where: { id: payload.sessionId },
        select: { revokedAt: true, expiresAt: true },
      })

      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        unauthorized(res, 'Session is invalid, revoked, or expired.')
        return
      }
    }

    req.auth = payload
    next()
  } catch {
    unauthorized(res, 'The access token is invalid or expired.')
  }
}
