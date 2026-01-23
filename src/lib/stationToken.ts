import jwt from 'jsonwebtoken'

/**
 * Station Token System - Secure device-bound authentication
 * 
 * stationToken is issued after successful pairing and includes:
 * - stationId: Which station this device represents
 * - locationId: Which location (derived from station, NEVER from client)
 * - deviceFingerprint: Unique device identifier (prevents token copying)
 * 
 * All POS API calls must validate stationToken and derive locationId from it.
 * NEVER accept locationId from client request body.
 */

const STATION_TOKEN_SECRET = process.env.STATION_TOKEN_SECRET ||
    'STATION_' + (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME')

// Token expires in 30 days (long-lived, bound to device)
const TOKEN_EXPIRY = '30d'

export interface StationTokenPayload {
    stationId: string
    locationId: string
    franchiseId: string
    deviceFingerprint: string
    stationName: string
    issuedAt: number
}

export interface ValidatedStation {
    stationId: string
    locationId: string
    franchiseId: string
    deviceFingerprint: string
    stationName: string
    isValid: boolean
}

/**
 * Issue a new stationToken after successful pairing
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

/**
 * Validate stationToken and extract payload
 * 
 * @param token - The stationToken from client
 * @param expectedDeviceFingerprint - Optional: If provided, must match token's fingerprint
 * @returns ValidatedStation or null if invalid
 */
export function validateStationToken(
    token: string | null | undefined,
    expectedDeviceFingerprint?: string
): ValidatedStation | null {
    if (!token) {
        return null
    }

    try {
        const payload = jwt.verify(token, STATION_TOKEN_SECRET) as StationTokenPayload

        // If device fingerprint provided, it must match
        if (expectedDeviceFingerprint && payload.deviceFingerprint !== expectedDeviceFingerprint) {
            console.error('[STATION_TOKEN] Device fingerprint mismatch - possible token theft')
            return null
        }

        return {
            stationId: payload.stationId,
            locationId: payload.locationId,
            franchiseId: payload.franchiseId,
            deviceFingerprint: payload.deviceFingerprint,
            stationName: payload.stationName,
            isValid: true
        }
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.error('[STATION_TOKEN] Token expired')
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.error('[STATION_TOKEN] Invalid token signature')
        }
        return null
    }
}

/**
 * Extract stationToken from request headers or body
 * Checks: Authorization header, X-Station-Token header, request body
 */
export function extractStationToken(
    headers: Headers,
    body?: { stationToken?: string }
): string | null {
    // Check Authorization header: "Bearer <token>"
    const authHeader = headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7)
    }

    // Check X-Station-Token header
    const tokenHeader = headers.get('x-station-token')
    if (tokenHeader) {
        return tokenHeader
    }

    // Check request body
    if (body?.stationToken) {
        return body.stationToken
    }

    return null
}

/**
 * Validate stationToken from request - helper for API routes
 * Returns validated station or null (with appropriate error logging)
 */
export async function validateStationFromRequest(
    headers: Headers,
    body?: { stationToken?: string; deviceId?: string }
): Promise<ValidatedStation | null> {
    const token = extractStationToken(headers, body)

    if (!token) {
        console.error('[STATION_AUTH] Missing stationToken')
        return null
    }

    // If deviceId provided, validate fingerprint match
    const validated = validateStationToken(token, body?.deviceId)

    if (!validated) {
        console.error('[STATION_AUTH] Invalid or expired stationToken')
        return null
    }

    return validated
}
