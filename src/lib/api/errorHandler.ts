/**
 * API Error Middleware
 * Standardized error handling and response formatting
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ApiErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'BAD_REQUEST'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'

export interface ApiError {
    success: false
    error: string
    code: ApiErrorCode
    details?: unknown
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
    message: string,
    code: ApiErrorCode,
    status: number,
    details?: unknown
): NextResponse<ApiError> {
    const body: ApiError = {
        success: false,
        error: message,
        code,
    }
    if (details) body.details = details
    return NextResponse.json(body, { status })
}

/**
 * Handle any error and return standardized response
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
    console.error('[API_ERROR]', error)

    // Zod validation error
    if (error instanceof ZodError) {
        return createErrorResponse(
            error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
            'VALIDATION_ERROR',
            422,
            error.issues
        )
    }

    // Prisma known errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const prismaError = error as { code: string; message?: string }

        switch (prismaError.code) {
            case 'P2002': // Unique constraint
                return createErrorResponse('Record already exists', 'CONFLICT', 409)
            case 'P2025': // Record not found
                return createErrorResponse('Record not found', 'NOT_FOUND', 404)
            case 'P2003': // Foreign key constraint
                return createErrorResponse('Related record not found', 'BAD_REQUEST', 400)
        }
    }

    // Generic error
    if (error instanceof Error) {
        return createErrorResponse(
            process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            'SERVER_ERROR',
            500
        )
    }

    return createErrorResponse('Internal server error', 'SERVER_ERROR', 500)
}

/**
 * Wrap API handler with error handling
 */
export function withErrorHandler<T>(
    handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiError>> {
    return handler().catch(handleApiError)
}
