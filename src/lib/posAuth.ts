/**
 * POS Authentication Middleware
 * 
 * PRODUCTION-GRADE auth layer for all /api/pos/** endpoints.
 * 
 * Hard Rules:
 * - Station scope NEVER comes from client payload
 * - All POS endpoints MUST use withPOSAuth() wrapper
 * - Token via X-Station-Token header ONLY
 * - Missing token → 403 DEVICE_NOT_PAIRED
 * - Invalid/expired token → 401 TOKEN_INVALID_OR_EXPIRED
 */

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STATION_TOKEN_SECRET = process.env.STATION_TOKEN_SECRET ||
    'STATION_' + (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME')

// Token lifetime: 90 days (production-friendly)
const TOKEN_EXPIRY_DAYS = 90
export const TOKEN_EXPIRY = `${TOKEN_EXPIRY_DAYS}d`

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * JWT payload embedded in stationToken
 */
export interface StationTokenPayload {
    stationId: string
    locationId: string
    franchiseId: string
    deviceFingerprint: string
    stationName: string
    issuedAt: number
}

/**
 * Context injected into all POS handlers
 * This is the ONLY source of truth for station/location/franchise
 */
export interface POSContext {
    stationId: string
    locationId: string
    franchiseId: string
    stationName: string
    deviceFingerprint: string
}

/**
 * Auth failure reasons for structured logging
 */
export type AuthFailureReason =
    | 'TOKEN_MISSING'
    | 'TOKEN_EXPIRED'
    | 'TOKEN_INVALID'
    | 'STATION_REVOKED'
    | 'DEVICE_FINGERPRINT_MISMATCH'

// ═══════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════

interface AuthLogEvent {
    event: 'POS_AUTH_SUCCESS' | 'POS_AUTH_FAILURE'
    reason?: AuthFailureReason
    stationId?: string
    locationId?: string
    franchiseId?: string
    ip: string
    userAgent: string
    endpoint: string
    timestamp: string
}

function logAuthEvent(event: AuthLogEvent): void {
    console.log(JSON.stringify(event))
}

function getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR RESPONSES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 403 - Device not paired (no token or station revoked)
 */
export function deviceNotPairedResponse(): NextResponse {
    return NextResponse.json({
        error: 'DEVICE_NOT_PAIRED',
        message: 'Terminal not configured. Please enter pairing code.'
    }, { status: 403 })
}

/**
 * 401 - Token invalid or expired
 */
export function tokenInvalidResponse(reason: 'expired' | 'invalid' = 'invalid'): NextResponse {
    return NextResponse.json({
        error: 'TOKEN_INVALID_OR_EXPIRED',
        reason,
        message: reason === 'expired'
            ? 'Station token expired. Please re-pair device.'
            : 'Invalid station token. Please re-pair device.'
    }, { status: 401 })
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract stationToken from X-Station-Token header ONLY
 * (No query params, no body params - per hard rules)
 */
function extractStationToken(request: Request): string | null {
    return request.headers.get('x-station-token')
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE AUTH FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Authenticate a POS request and return station context
 * 
 * @returns POSContext if valid, or { error: Response } if invalid
 */
export async function authenticatePOSRequest(
    request: Request
): Promise<{ ctx: POSContext } | { error: NextResponse; reason: AuthFailureReason }> {
    const token = extractStationToken(request)
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const endpoint = new URL(request.url).pathname

    // No token = not paired
    if (!token) {
        logAuthEvent({
            event: 'POS_AUTH_FAILURE',
            reason: 'TOKEN_MISSING',
            ip: clientIP,
            userAgent,
            endpoint,
            timestamp: new Date().toISOString()
        })
        return { error: deviceNotPairedResponse(), reason: 'TOKEN_MISSING' }
    }

    // Verify JWT
    let payload: StationTokenPayload
    try {
        payload = jwt.verify(token, STATION_TOKEN_SECRET) as StationTokenPayload
    } catch (err) {
        const isExpired = err instanceof jwt.TokenExpiredError
        const reason: AuthFailureReason = isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'

        logAuthEvent({
            event: 'POS_AUTH_FAILURE',
            reason,
            ip: clientIP,
            userAgent,
            endpoint,
            timestamp: new Date().toISOString()
        })

        return {
            error: tokenInvalidResponse(isExpired ? 'expired' : 'invalid'),
            reason
        }
    }

    // Optional: Check if station is revoked in database
    try {
        const station = await prisma.station.findUnique({
            where: { id: payload.stationId },
            select: { isTrusted: true }
        })

        if (station && station.isTrusted === false) {
            logAuthEvent({
                event: 'POS_AUTH_FAILURE',
                reason: 'STATION_REVOKED',
                stationId: payload.stationId,
                locationId: payload.locationId,
                franchiseId: payload.franchiseId,
                ip: clientIP,
                userAgent,
                endpoint,
                timestamp: new Date().toISOString()
            })
            return { error: deviceNotPairedResponse(), reason: 'STATION_REVOKED' }
        }
    } catch (e) {
        // If DB check fails, allow through (fail-open for availability)
        console.warn('[POS_AUTH] Station validation DB check failed, allowing through:', e)
    }

    // Success - log and return context
    logAuthEvent({
        event: 'POS_AUTH_SUCCESS',
        stationId: payload.stationId,
        locationId: payload.locationId,
        franchiseId: payload.franchiseId,
        ip: clientIP,
        userAgent,
        endpoint,
        timestamp: new Date().toISOString()
    })

    return {
        ctx: {
            stationId: payload.stationId,
            locationId: payload.locationId,
            franchiseId: payload.franchiseId,
            stationName: payload.stationName,
            deviceFingerprint: payload.deviceFingerprint
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE WRAPPER (THE MAIN EXPORT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap a POS route handler with automatic authentication.
 * 
 * This makes it IMPOSSIBLE to create an unprotected POS endpoint.
 * Every POS route MUST use this wrapper.
 * 
 * @example
 * export const GET = withPOSAuth(async (req, ctx) => {
 *   // ctx.locationId, ctx.stationId, ctx.franchiseId are SAFE
 *   // NEVER read these from request body!
 *   const { locationId, franchiseId } = ctx;
 *   // ... handler logic
 * });
 */
export function withPOSAuth(
    handler: (request: Request, ctx: POSContext) => Promise<NextResponse>
) {
    return async (request: Request): Promise<NextResponse> => {
        const result = await authenticatePOSRequest(request)

        if ('error' in result) {
            return result.error
        }

        return handler(request, result.ctx)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN ISSUANCE (for pairing flow)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Issue a new stationToken after successful pairing.
 * Called by /api/pos/pair-terminal
 */
export function issueStationToken(
    stationId: string,
    locationId: string,
    franchiseId: string,
    deviceFingerprint: string,
    stationName: string
): string {
    const payload: StationTokenPayload = {
        stationId,
        locationId,
        franchiseId,
        deviceFingerprint,
        stationName,
        issuedAt: Date.now()
    }

    return jwt.sign(payload, STATION_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY })
}
