import { NextResponse } from 'next/server'

/**
 * Safe API route wrapper — catches all errors and returns structured JSON.
 * Prevents raw 500s from reaching users.
 * 
 * Usage:
 *   return safeApiRoute('GET /api/my-route', async () => {
 *     // your logic here
 *     return NextResponse.json({ data: result })
 *   })
 */
export async function safeApiRoute(
    routeName: string,
    handler: () => Promise<NextResponse>,
    fallbackData?: any
): Promise<NextResponse> {
    try {
        return await handler()
    } catch (error: any) {
        const message = error?.message || 'Unknown error'
        const isPrismaError = message.includes('PrismaClient') || 
                              message.includes('does not exist') ||
                              message.includes('Unknown arg') ||
                              message.includes('Invalid `prisma')
        
        console.error(`[API_ERROR] ${routeName}:`, {
            message,
            type: isPrismaError ? 'PRISMA' : 'RUNTIME',
            stack: error?.stack?.split('\n').slice(0, 3).join(' → ')
        })

        // If caller provided fallback data, return 200 with empty data
        // This prevents UI from breaking on missing tables
        if (fallbackData !== undefined) {
            return NextResponse.json(fallbackData)
        }

        return NextResponse.json({
            error: 'Internal server error',
            route: routeName,
            type: isPrismaError ? 'database' : 'runtime',
        }, { status: 500 })
    }
}

/**
 * Safe Prisma query wrapper — returns fallback on any DB error.
 * Use for queries that might fail due to unmigrated tables.
 */
export async function safePrismaQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    fallback: T
): Promise<T> {
    try {
        return await query()
    } catch (error: any) {
        console.warn(`[DB_WARN] ${queryName}: ${error?.message?.slice(0, 120)}`)
        return fallback
    }
}
