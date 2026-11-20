import type { Request, Response } from 'express'

export const ACCESS_COOKIE = 'access_token'
export const REFRESH_COOKIE = 'refresh_token'
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000 // 15 minutes

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshMaxAgeMs: number
) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  })
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: refreshMaxAgeMs,
  })
}

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE, {
    path: cookieOptions.path,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  })
  res.clearCookie(REFRESH_COOKIE, {
    path: cookieOptions.path,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  })
}

export const readCookie = (req: Request, name: string): string | undefined => {
  // Check express cookie-parser object first if present, then fallback to header parse
  if (req.cookies && typeof req.cookies === 'object' && name in req.cookies) {
    const val = req.cookies[name]
    return typeof val === 'string' ? val : undefined
  }
  const cookieHeader = req.header('cookie')
  if (!cookieHeader) return undefined
  const parts = cookieHeader.split(';')
  for (const rawPart of parts) {
    const part = rawPart.trim()
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1))
    }
  }
  return undefined
}
