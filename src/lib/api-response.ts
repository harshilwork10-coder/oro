import { NextResponse } from 'next/server'

/**
 * Standardized API Response Utility
 * 
 * Usage:
 *   return ApiResponse.success(data)
 *   return ApiResponse.error('Not found', 404)
 *   return ApiResponse.created(newRecord)
 *   return ApiResponse.paginated(items, { cursor, hasMore, total })
 */

interface ErrorDetails {
    code?: string
    field?: string
    details?: Record<string, unknown>
}

interface PaginationMeta {
    cursor?: string | null
    nextCursor?: string | null
    hasMore: boolean
    total?: number
    page?: number
    pageSize?: number
}

interface ApiErrorResponse {
    success: false
    error: {
        message: string
        code?: string
        field?: string
        details?: Record<string, unknown>
        correlationId: string
    }
}

interface ApiSuccessResponse<T> {
    success: true
    data: T
}

interface ApiPaginatedResponse<T> {
    success: true
    data: T[]
    pagination: PaginationMeta
}

// Generate correlation ID for request tracing
function generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export class ApiResponse {
    /**
     * Return successful response with data
     */
    static success<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
        return NextResponse.json({ success: true, data }, { status })
    }

    /**
     * Return created response (201)
     */
    static created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
        return NextResponse.json({ success: true, data }, { status: 201 })
    }

    /**
     * Return paginated response
     */
    static paginated<T>(
        data: T[],
        pagination: PaginationMeta
    ): NextResponse<ApiPaginatedResponse<T>> {
        return NextResponse.json({
            success: true,
            data,
            pagination
        })
    }

    /**
     * Return error response with consistent format
     */
    static error(
        message: string,
        status: number = 400,
        errorDetails?: ErrorDetails
    ): NextResponse<ApiErrorResponse> {
        return NextResponse.json(
            {
                success: false,
                error: {
                    message,
                    code: errorDetails?.code,
                    field: errorDetails?.field,
                    details: errorDetails?.details,
                    correlationId: generateCorrelationId()
                }
            },
            { status }
        )
    }

    /**
     * Return 401 Unauthorized
     */
    static unauthorized(message: string = 'Unauthorized'): NextResponse<ApiErrorResponse> {
        return this.error(message, 401, { code: 'UNAUTHORIZED' })
    }

    /**
     * Return 403 Forbidden
     */
    static forbidden(message: string = 'Forbidden'): NextResponse<ApiErrorResponse> {
        return this.error(message, 403, { code: 'FORBIDDEN' })
    }

    /**
     * Return 404 Not Found
     */
    static notFound(resource: string = 'Resource'): NextResponse<ApiErrorResponse> {
        return this.error(`${resource} not found`, 404, { code: 'NOT_FOUND' })
    }

    /**
     * Return 409 Conflict
     */
    static conflict(message: string): NextResponse<ApiErrorResponse> {
        return this.error(message, 409, { code: 'CONFLICT' })
    }

    /**
     * Return 422 Validation Error
     */
    static validationError(
        message: string,
        field?: string,
        details?: Record<string, unknown>
    ): NextResponse<ApiErrorResponse> {
        return this.error(message, 422, { code: 'VALIDATION_ERROR', field, details })
    }

    /**
     * Return 500 Internal Server Error
     */
    static serverError(
        message: string = 'Internal server error',
        errorDetails?: ErrorDetails
    ): NextResponse<ApiErrorResponse> {
        return this.error(message, 500, { code: 'INTERNAL_ERROR', ...errorDetails })
    }

    /**
     * Return 429 Rate Limited
     */
    static rateLimited(retryAfter?: number): NextResponse<ApiErrorResponse> {
        const response = this.error('Too many requests', 429, { code: 'RATE_LIMITED' })
        if (retryAfter) {
            response.headers.set('Retry-After', String(retryAfter))
        }
        return response
    }

    /**
     * Return 204 No Content (for DELETE operations)
     */
    static noContent(): NextResponse {
        return new NextResponse(null, { status: 204 })
    }
}

// Export types for consumers
export type { ApiErrorResponse, ApiSuccessResponse, ApiPaginatedResponse, PaginationMeta }
