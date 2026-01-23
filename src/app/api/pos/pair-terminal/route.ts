import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueStationToken } from '@/lib/stationToken'

// Rate limiting (simple in-memory for now)
const pairingAttempts = new Map<string, { count: number; lastAttempt: Date }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

function checkRateLimit(deviceId: string): { allowed: boolean; remainingAttempts?: number } {
    const now = new Date()
    const record = pairingAttempts.get(deviceId)

    if (record) {
        const lockoutExpiry = new Date(record.lastAttempt.getTime() + LOCKOUT_MINUTES * 60 * 1000)
        if (record.count >= MAX_ATTEMPTS && now < lockoutExpiry) {
            return { allowed: false }
        }
        if (now >= lockoutExpiry) {
            // Reset after lockout
            pairingAttempts.delete(deviceId)
        }
    }
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - (record?.count || 0) }
}

function recordAttempt(deviceId: string) {
    const record = pairingAttempts.get(deviceId) || { count: 0, lastAttempt: new Date() }
    record.count++
    record.lastAttempt = new Date()
    pairingAttempts.set(deviceId, record)
}

function clearAttempts(deviceId: string) {
    pairingAttempts.delete(deviceId)
}

// POST /api/pos/pair-terminal
// Pairs an Android device to a POS station using the pairing code
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { pairingCode, deviceId, deviceInfo, requestedStationName } = body

        // Validate required fields
        if (!pairingCode || !deviceId) {
            return NextResponse.json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'pairingCode and deviceId are required'
            }, { status: 400 })
        }

        // Rate limiting check
        const rateCheck = checkRateLimit(deviceId)
        if (!rateCheck.allowed) {
            return NextResponse.json({
                success: false,
                error: 'TOO_MANY_ATTEMPTS',
                message: `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
            }, { status: 429 })
        }

        // Find station by pairing code
        const station = await prisma.station.findUnique({
            where: { pairingCode: pairingCode.toUpperCase() },
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        businessType: true,
                        paxTerminalIP: true,
                        paxTerminalPort: true,
                        franchise: {
                            select: {
                                id: true,
                                name: true,
                                franchisorId: true
                            }
                        }
                    }
                },
                dedicatedTerminal: true
            }
        })

        if (!station) {
            recordAttempt(deviceId)
            return NextResponse.json({
                success: false,
                error: 'INVALID_PAIRING_CODE',
                message: 'Invalid pairing code. Check the code and try again.',
                remainingAttempts: (rateCheck.remainingAttempts || 5) - 1
            }, { status: 404 })
        }

        // Check if station is already paired to a DIFFERENT device
        if (station.pairingStatus === 'PAIRED' && station.pairedDeviceId && station.pairedDeviceId !== deviceId) {
            return NextResponse.json({
                success: false,
                error: 'STATION_ALREADY_PAIRED',
                message: 'This station is already paired to another device. Contact your provider to reset pairing.'
            }, { status: 409 })
        }

        // Check pairing code expiry (if set)
        if (station.pairingCodeExpiresAt && new Date() > station.pairingCodeExpiresAt) {
            return NextResponse.json({
                success: false,
                error: 'PAIRING_CODE_EXPIRED',
                message: 'This pairing code has expired. Generate a new code from your dashboard settings.'
            }, { status: 410 })
        }

        // SUCCESS - Update station with device binding
        const updatedStation = await prisma.station.update({
            where: { id: station.id },
            data: {
                pairingStatus: 'PAIRED',
                pairedDeviceId: deviceId,
                pairedAt: new Date(),
                lastHeartbeatAt: new Date(),
                isTrusted: true, // CRITICAL: Mark station as trusted for API access
                // Optionally update name if requested
                ...(requestedStationName && { name: requestedStationName })
            }
        })

        // Clear rate limit on success
        clearAttempts(deviceId)

        // Build station config response
        const location = station.location
        const franchise = location.franchise

        const stationConfig = {
            // Terminal settings
            paxTerminalIP: location.paxTerminalIP || null,
            paxTerminalPort: location.paxTerminalPort || '10009',
            paymentMode: station.paymentMode,

            // Dedicated terminal if assigned
            dedicatedTerminal: station.dedicatedTerminal ? {
                id: station.dedicatedTerminal.id,
                ip: station.dedicatedTerminal.terminalIP,
                port: station.dedicatedTerminal.terminalPort,
                type: station.dedicatedTerminal.terminalType
            } : null
        }

        // SECURITY: Issue stationToken for future API calls
        const stationToken = issueStationToken(
            station.id,
            location.id,
            franchise.id,
            deviceId,
            updatedStation.name
        )

        return NextResponse.json({
            success: true,
            data: {
                stationId: station.id,
                stationName: updatedStation.name,
                locationId: location.id,
                locationName: location.name,
                businessType: location.businessType || 'RETAIL',
                franchiseId: franchise.id,
                franchiseName: franchise.name,
                franchisorId: franchise.franchisorId,
                stationConfig,
                stationToken // JWT for secure API calls
            }
        })

    } catch (error) {
        console.error('[pair-terminal] Error:', error)
        return NextResponse.json({
            success: false,
            error: 'SERVER_ERROR',
            message: 'An unexpected error occurred'
        }, { status: 500 })
    }
}
