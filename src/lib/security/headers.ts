/**
 * Security Headers Utility
 * Adds security headers to responses for XSS, clickjacking, and other protections
 */

export const SECURITY_HEADERS = {
    // Prevents XSS attacks by restricting resource loading
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '),

    // Prevents clickjacking
    'X-Frame-Options': 'SAMEORIGIN',

    // Prevents MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enables XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Controls referrer information sent with requests
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Prevents browser from storing sensitive data
    'Cache-Control': 'no-store, max-age=0',

    // Additional protections for IE
    'X-Download-Options': 'noopen',

    // Disables certain dangerous features
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

/**
 * Add security headers to a Response or NextResponse
 */
export function addSecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers)

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        headers.set(key, value)
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    })
}

/**
 * Create headers object with security headers included
 */
export function getSecureHeaders(
    additionalHeaders?: Record<string, string>
): Record<string, string> {
    return {
        ...SECURITY_HEADERS,
        ...additionalHeaders
    }
}

/**
 * Security headers middleware configuration for next.config.js
 */
export const securityHeadersConfig = [
    {
        source: '/(.*)',
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
            key,
            value
        }))
    }
]

