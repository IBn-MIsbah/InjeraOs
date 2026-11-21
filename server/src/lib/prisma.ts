import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '../generated/prisma/client.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL must be configured before starting the API.')

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

export { Prisma }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
