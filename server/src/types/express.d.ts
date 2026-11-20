import type { AuthenticatedUser } from '../modules/auth/auth.types.js'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser
      cookies?: Record<string, string>
      id?: string
    }
  }
}

export {}
