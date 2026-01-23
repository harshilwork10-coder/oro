/**
 * POS Token Refresh API
 * 
 * POST /api/pos/refresh-token
 * 
 * Allows Android devices to silently refresh their station token
 * before it expires. This enables "pair once, works forever" UX.
 * 
 * Security:
 * - Validates current token (allows expired tokens up to 30 days old)
 * - Verifies device fingerprint matches
 * - Issues new 90-day token
 * - Logs refresh events for audit
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { issueStationToken, StationTokenPayload } from '@/lib/posAuth'

const STATION_TOKEN_SECRET = process.env.STATION_TOKEN_SECRET ||
    'STATION_' + (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'CHANGE_ME')

// Allow tokens up to 30 days past expiry for refresh (grace period)
const REFRESH_GRACE_PERIOD_DAYS = 30

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { currentToken, deviceId } = body

        if (!currentToken || !deviceId) {
            return NextResponse.json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'currentToken and deviceId are required'
            }, { status: 400 })
        }

        // Decode token (allow expired tokens for refresh)
        let payload: StationTokenPayload
        try {
            // First try normal verification
            payload = jwt.verify(currentToken, STATION_TOKEN_SECRET) as StationTokenPayload
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                // Token expired - decode without verification to check grace period
                const decoded = jwt.decode(currentToken) as StationTokenPayload | null
                if (!decoded) {
                    return NextResponse.json({
                        success: false,
                        error: 'TOKEN_INVALID',
                        message: 'Invalid token format'
                    }, { status: 401 })
                }

                // Check if within grace period (30 days past expiry)
                const expiredAt = (decoded.issuedAt || 0) + (90 * 24 * 60 * 60 * 1000) // 90 days from issue
                const gracePeriodEnd = expiredAt + (REFRESH_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

                if (Date.now() > gracePeriodEnd) {
                    console.log(`[refresh-token] Token too old for refresh: ${decoded.stationId}`)
                    return NextResponse.json({
                        success: false,
                        error: 'TOKEN_TOO_OLD',
                        message: 'Token expired beyond refresh grace period. Please re-pair device.'
                    }, { status: 401 })
                }

                payload = decoded
            } else {
                // Invalid signature or other error
                return NextResponse.json({
                    success: false,
                    error: 'TOKEN_INVALID',
                    message: 'Invalid token'
                }, { status: 401 })
            }
        }

        // Verify device fingerprint matches
        if (payload.deviceFingerprint !== deviceId) {
            console.warn(`[refresh-token] Device fingerprint mismatch for station ${payload.stationId}`)
            return NextResponse.json({
                success: false,
                error: 'DEVICE_MISMATCH',
                message: 'Device fingerprint does not match. Re-pair required.'
            }, { status: 403 })
        }

        // Verify station still exists and is trusted
        const station = await prisma.station.findUnique({
            where: { id: payload.stationId },
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        franchise: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        })

        if (!station) {
            return NextResponse.json({
                success: false,
                error: 'STATION_NOT_FOUND',
                message: 'Station no longer exists'
            }, { status: 404 })
        }

        if (!station.isTrusted) {
            return NextResponse.json({
                success: false,
                error: 'STATION_REVOKED',
                message: 'Station access has been revoked'
            }, { status: 403 })
        }

        // Issue new token with CURRENT database values (not old token values)
        // This automatically fixes stale locationId issues!
        const newToken = issueStationToken(
            station.id,
            station.location.id,  // Use CURRENT locationId from database
            station.location.franchise.id,
            deviceId,
            station.name
        )

        // Update last activity
        await prisma.station.update({
            where: { id: station.id },
            data: { lastHeartbeatAt: new Date() }
        })

        console.log(`[refresh-token] Token refreshed for station ${station.name} (${station.id.slice(-8)})`)

        return NextResponse.json({
            success: true,
            data: {
                stationToken: newToken,
                stationId: station.id,
                stationName: station.name,
                locationId: station.location.id,
                locationName: station.location.name,
                franchiseId: station.location.franchise.id,
                expiresIn: '90d'
            }
        })

    } catch (error) {
        console.error('[refresh-token] Error:', error)
        return NextResponse.json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'Failed to refresh token'
        }, { status: 500 })
    }
}
