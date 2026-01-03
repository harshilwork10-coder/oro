import { Prisma } from '@prisma/client'

/**
 * Pagination Utility for Prisma queries
 * 
 * Usage:
 *   const { data, pagination } = await paginate(prisma.product, {
 *     where: { franchiseId },
 *     orderBy: { name: 'asc' },
 *     take: 50,
 *     cursor: req.searchParams.get('cursor')
 *   })
 */

export interface PaginationOptions {
    take?: number          // Items per page (default: 50, max: 100)
    cursor?: string | null // Cursor for next page
    orderBy?: Record<string, 'asc' | 'desc'>
}

export interface PaginationResult<T> {
    data: T[]
    pagination: {
        nextCursor: string | null
        hasMore: boolean
        count: number
    }
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

/**
 * Paginate any Prisma model query with cursor-based pagination
 * 
 * @param model - Prisma model delegate (e.g., prisma.product)
 * @param where - Prisma where clause
 * @param options - Pagination options
 */
export async function paginate<T extends { id: string }>(
    model: {
        findMany: (args: {
            where?: object
            take?: number
            skip?: number
            cursor?: { id: string }
            orderBy?: object
            select?: object
            include?: object
        }) => Promise<T[]>
    },
    where: object = {},
    options: PaginationOptions & {
        select?: object
        include?: object
    } = {}
): Promise<PaginationResult<T>> {
    const take = Math.min(options.take || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const cursor = options.cursor

    const queryArgs: {
        where: object
        take: number
        skip?: number
        cursor?: { id: string }
        orderBy?: object
        select?: object
        include?: object
    } = {
        where,
        take: take + 1, // Fetch one extra to determine if there's more
        orderBy: options.orderBy || { createdAt: 'desc' as const }
    }

    // Add cursor for pagination
    if (cursor) {
        queryArgs.cursor = { id: cursor }
        queryArgs.skip = 1 // Skip the cursor item itself
    }

    // Pass through select/include
    if (options.select) queryArgs.select = options.select
    if (options.include) queryArgs.include = options.include

    const results = await model.findMany(queryArgs)

    const hasMore = results.length > take
    const data = hasMore ? results.slice(0, take) : results
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

    return {
        data,
        pagination: {
            nextCursor,
            hasMore,
            count: data.length
        }
    }
}

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationOptions {
    const take = searchParams.get('limit') || searchParams.get('take')
    const cursor = searchParams.get('cursor')
    const sortBy = searchParams.get('sortBy')
    const sortOrder = searchParams.get('sortOrder')

    return {
        take: take ? Math.min(parseInt(take), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
        cursor: cursor || undefined,
        orderBy: sortBy ? { [sortBy]: (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' } : undefined
    }
}

/**
 * Offset-based pagination (for simpler use cases or UI requirements)
 */
export async function paginateOffset<T>(
    model: {
        findMany: (args: { where?: object; take?: number; skip?: number; orderBy?: object; select?: object; include?: object }) => Promise<T[]>
        count: (args: { where?: object }) => Promise<number>
    },
    where: object = {},
    options: {
        page?: number
        pageSize?: number
        orderBy?: object
        select?: object
        include?: object
    } = {}
): Promise<{
    data: T[]
    pagination: {
        page: number
        pageSize: number
        totalPages: number
        totalCount: number
        hasMore: boolean
    }
}> {
    const page = Math.max(1, options.page || 1)
    const pageSize = Math.min(options.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const skip = (page - 1) * pageSize

    const [data, totalCount] = await Promise.all([
        model.findMany({
            where,
            take: pageSize,
            skip,
            orderBy: options.orderBy || { createdAt: 'desc' as const },
            select: options.select,
            include: options.include
        }),
        model.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    return {
        data,
        pagination: {
            page,
            pageSize,
            totalPages,
            totalCount,
            hasMore: page < totalPages
        }
    }
}
