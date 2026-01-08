/**
 * Standardized API Response Helpers
 * Consistent error/success responses across all API routes
 */

import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

// ============ RESPONSE TYPES ============

export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data?: T;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============ SUCCESS RESPONSES ============

export function successResponse<T>(data: T, status: number = 200) {
    return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T) {
    return successResponse(data, 201);
}

export function messageResponse(message: string, data?: unknown) {
    return NextResponse.json({ success: true, message, data }, { status: 200 });
}

export function noContentResponse() {
    return new NextResponse(null, { status: 204 });
}

// ============ ERROR RESPONSES ============

export function errorResponse(
    message: string,
    status: number = 400,
    code?: string,
    details?: unknown
) {
    const response: ApiErrorResponse = {
        success: false,
        error: message
    };
    if (code) response.code = code;
    if (details) response.details = details;

    return NextResponse.json(response, { status });
}

export function badRequestResponse(message: string, details?: unknown) {
    return errorResponse(message, 400, 'BAD_REQUEST', details);
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
    return errorResponse(message, 401, 'UNAUTHORIZED');
}

export function forbiddenResponse(message: string = 'Forbidden') {
    return errorResponse(message, 403, 'FORBIDDEN');
}

export function notFoundResponse(resource: string = 'Resource') {
    return errorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

export function conflictResponse(message: string) {
    return errorResponse(message, 409, 'CONFLICT');
}

export function validationErrorResponse(error: ZodError) {
    const issues = error.issues as Array<{ path: (string | number)[]; message: string }>;
    const message = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return errorResponse(message, 422, 'VALIDATION_ERROR', issues);
}

export function serverErrorResponse(message: string = 'Internal server error') {
    return errorResponse(message, 500, 'SERVER_ERROR');
}

export function rateLimitResponse(retryAfter?: number) {
    const headers: Record<string, string> = {};
    if (retryAfter) {
        headers['Retry-After'] = String(retryAfter);
    }
    return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
        { status: 429, headers }
    );
}

// ============ VALIDATION MIDDLEWARE ============

/**
 * Validate request body with Zod schema
 * Returns validated data or sends error response
 */
export async function validateBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return { error: validationErrorResponse(result.error) };
        }

        return { data: result.data };
    } catch {
        return { error: badRequestResponse('Invalid JSON body') };
    }
}

/**
 * Validate query params with Zod schema
 */
export function validateQuery<T>(
    request: Request,
    schema: z.ZodSchema<T>
): { data: T } | { error: NextResponse } {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const result = schema.safeParse(params);

    if (!result.success) {
        return { error: validationErrorResponse(result.error) };
    }

    return { data: result.data };
}
