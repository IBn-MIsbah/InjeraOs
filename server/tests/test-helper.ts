import 'dotenv/config'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

export interface RequestOptions {
  headers?: Record<string, string>
  cookies?: string[]
}

export interface TestResponse<T = any> {
  status: number
  headers: Headers
  cookies: string[]
  body: T
}

export class TestAgent {
  private server: Server | null = null
  public baseUrl = ''
  private sessionCookies: string[] = []

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = app.listen(0, () => {
        const address = this.server!.address() as AddressInfo
        this.baseUrl = `http://localhost:${address.port}`
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve()
      this.server.close((err) => (err ? reject(err) : resolve()))
    })
  }

  setCookies(cookies: string[]): void {
    this.sessionCookies = cookies
  }

  getCookies(): string[] {
    return this.sessionCookies
  }

  clearCookies(): void {
    this.sessionCookies = []
  }

  private extractCookies(res: Response): string[] {
    // Collect all set-cookie header values
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
    if (rawCookies.length === 0) {
      const single = res.headers.get('set-cookie')
      if (single) rawCookies.push(single)
    }
    return rawCookies.map((c) => c.split(';')[0])
  }

  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<TestResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': 'test-device-uuid',
      'X-Device-Name': 'Test Runner Client',
      ...options.headers,
    }

    const mergedCookies = [...(options.cookies ?? this.sessionCookies)]
    if (mergedCookies.length > 0) {
      headers.Cookie = mergedCookies.join('; ')
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(body)
    }

    const res = await fetch(url, fetchOptions)
    const newCookies = this.extractCookies(res)
    if (newCookies.length > 0) {
      // Update session cookies with newer cookies
      const cookieMap = new Map<string, string>()
      for (const c of this.sessionCookies) {
        const [name] = c.split('=')
        cookieMap.set(name, c)
      }
      for (const c of newCookies) {
        const [name] = c.split('=')
        cookieMap.set(name, c)
      }
      this.sessionCookies = Array.from(cookieMap.values())
    }

    let parsedBody: any = null
    const text = await res.text()
    if (text) {
      try {
        parsedBody = JSON.parse(text)
      } catch {
        parsedBody = text
      }
    }

    return {
      status: res.status,
      headers: res.headers,
      cookies: this.sessionCookies,
      body: parsedBody,
    }
  }

  get<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>('GET', path, undefined, options)
  }

  post<T = any>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', path, body, options)
  }

  patch<T = any>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PATCH', path, body, options)
  }

  put<T = any>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', path, body, options)
  }

  delete<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>('DELETE', path, undefined, options)
  }
}

export async function cleanupTestData(businessIds: string[], userIds: string[] = []): Promise<void> {
  const bIds = businessIds.filter(Boolean)
  const uIds = userIds.filter(Boolean)

  if (bIds.length > 0) {
    await prisma.authSession.deleteMany({ where: { businessId: { in: bIds } } })
    await prisma.businessMembership.deleteMany({ where: { businessId: { in: bIds } } })
    const roles = await prisma.role.findMany({
      where: { businessId: { in: bIds } },
      select: { id: true },
    })
    if (roles.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: { in: roles.map((r) => r.id) } },
      })
      await prisma.role.deleteMany({ where: { id: { in: roles.map((r) => r.id) } } })
    }
    await prisma.business.deleteMany({ where: { id: { in: bIds } } })
  }

  if (uIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: uIds } } })
  }
}

export { prisma }
