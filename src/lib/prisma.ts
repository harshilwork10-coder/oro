import { PrismaClient } from '@prisma/client'

/**
 * Primary Prisma client singleton.
 *
 * CONNECTION POOLING (P0 — production requirement):
 * DATABASE_URL must point to a connection pooler (Supavisor port 6543, PgBouncer, or Prisma Accelerate).
 * Append ?connection_limit=1&pool_timeout=10 to the pooled URL.
 * DIRECT_DATABASE_URL (in schema.prisma directUrl) is used ONLY for migrations.
 *
 * In development, the client is cached on globalThis to survive HMR.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
