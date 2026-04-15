import { PrismaClient } from '@prisma/client'

/**
 * Read-Only Prisma Client (P1 — report isolation).
 *
 * Separates reporting/dashboard queries from OLTP (checkout, check-in, heartbeat).
 * Uses DATABASE_URL_READONLY which should point to:
 *   - A read replica (Supabase/Neon read replica endpoint)
 *   - Or the same database with a separate connection pool + longer statement_timeout
 *
 * Fallback: If DATABASE_URL_READONLY is not set, uses the primary DATABASE_URL.
 * This allows immediate deployment before a read replica is provisioned.
 *
 * Usage: Import prismaReadonly in report routes instead of prisma.
 *   import { prismaReadonly as prisma } from '@/lib/prisma-readonly'
 */

const globalForPrismaReadonly = globalThis as unknown as {
    prismaReadonly: PrismaClient | undefined
}

const readonlyUrl = process.env.DATABASE_URL_READONLY || process.env.DATABASE_URL

export const prismaReadonly =
    globalForPrismaReadonly.prismaReadonly ??
    new PrismaClient({
        datasources: {
            db: { url: readonlyUrl }
        },
        log: ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrismaReadonly.prismaReadonly = prismaReadonly
