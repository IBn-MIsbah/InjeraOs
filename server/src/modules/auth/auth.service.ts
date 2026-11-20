import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { AccessTokenPayload } from './auth.types.js'

const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured in production')
    }
    return 'dev-insecure-secret-key-change-me-in-production-min32chars'
  }
  return secret
}

const jwtExpiresIn = (): NonNullable<SignOptions['expiresIn']> =>
  (process.env.JWT_EXPIRES_IN ?? '15m') as NonNullable<SignOptions['expiresIn']>

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12)
export const verifyPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash)

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, jwtSecret(), { expiresIn: jwtExpiresIn() } as SignOptions)

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, jwtSecret())
  if (typeof payload === 'string' || !payload.userId || !payload.businessId) {
    throw new Error('Invalid access token payload')
  }

  return {
    userId: payload.userId,
    businessId: payload.businessId,
    membershipId: payload.membershipId,
    sessionId: payload.sessionId,
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  }
}
