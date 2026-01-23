import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueStationToken } from '@/lib/stationToken'

// SECURITY: Rate limiting for pairing code validation (stricter than login)
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // Max 5 attempts per minute per IP

// Simple in-memory rate limiter (use Redis in production)
const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const record = ipAttempts.get(ip)

    if (!record || now > record.resetAt) {
        ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return { allowed: true }
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000)
        return { allowed: false, retryAfter }
    }

    record.count++
    return { allowed: true }
}

/**
 * POST - Validate station pairing code and issue stationToken
 * 
 * SECURITY RULES:
 * 1. Pairing code is ONE-TIME USE
 * 2. Pairing code EXPIRES after 24 hours
 * 3. Device fingerprint is BOUND to station
 * 4. stationToken is issued (contains locationId - NEVER from client)
 */
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Get client IP for rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || 'unknown'

        // SECURITY: Check rate limit first
        const rateCheck = checkRateLimit(clientIP)
        if (!rateCheck.allowed) {
            console.error(`[SECURITY] Pairing rate limit exceeded from IP ${clientIP}`)
            return NextResponse.json({
                error: 'Too many pairing attempts. Please try again later.',
                retryAfter: rateCheck.retryAfter
            }, { status: 429 })
        }

        // Defensive parsing
        let body: { code?: string; deviceId?: string; meta?: Record<string, string> }
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const { code, deviceId, meta } = body

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Station code is required' }, { status: 400 })
        }

        // SECURITY: Device fingerprint is REQUIRED for pairing
        if (!deviceId) {
            return NextResponse.json({
                error: 'Device ID is required for pairing',
                code: 'DEVICE_ID_REQUIRED'
            }, { status: 400 })
        }

        const cleanCode = code.toUpperCase().trim()

        // Find station by pairing code
        const station = await prisma.station.findFirst({
            where: {
                pairingCode: cleanCode,
                isActive: true
            },
            include: {
                location: {
                    include: {
                        franchise: {
                            select: {
                                id: true,
                                settings: { select: { storeLogo: true } },
                                franchisor: {
                                    select: { id: true, name: true, industryType: true }
                                }
                            }
                        }
                    }
                },
                dedicatedTerminal: true
            }
        })

        if (!station) {
            console.error(`[SECURITY] Invalid pairing code attempt: ${cleanCode} from IP ${clientIP}`)
            return NextResponse.json({ error: 'Invalid station code' }, { status: 400 })
        }

        // SECURITY CHECK 1: Has code been used? (one-time use)
        if (station.pairingCodeUsedAt) {
            // Allow re-pairing ONLY if same device
            if (station.pairedDeviceId !== deviceId) {
                console.error(`[SECURITY] Pairing code already used. Station: ${station.id}, attempted deviceId: ${deviceId}`)
                return NextResponse.json({
                    error: 'Pairing code already used. Contact administrator for a new code.',
                    code: 'CODE_ALREADY_USED'
                }, { status: 403 })
            }
            // Same device re-pairing is OK (refresh scenario)
        }

        // SECURITY CHECK 2: Has code expired?
        if (station.pairingCodeExpiresAt && new Date() > station.pairingCodeExpiresAt) {
            console.error(`[SECURITY] Expired pairing code. Station: ${station.id}`)
            return NextResponse.json({
                error: 'Pairing code has expired. Contact administrator for a new code.',
                code: 'CODE_EXPIRED'
            }, { status: 403 })
        }

        // SECURITY CHECK 3: If already paired to different device, block
        if (station.isTrusted && station.pairedDeviceId && station.pairedDeviceId !== deviceId) {
            console.error(`[SECURITY] Station already paired to different device. Station: ${station.id}, current: ${station.pairedDeviceId}, attempted: ${deviceId}`)
            return NextResponse.json({
                error: 'Station is already paired to another device. Contact administrator to transfer.',
                code: 'DEVICE_MISMATCH'
            }, { status: 403 })
        }

        // SUCCESS: Update station with device binding
        await prisma.station.update({
            where: { id: station.id },
            data: {
                pairingStatus: 'PAIRED',
                pairedDeviceId: deviceId,
                pairedAt: new Date(),
                pairingCodeUsedAt: station.pairingCodeUsedAt || new Date(), // First use
                lastHeartbeatAt: new Date(),
                isTrusted: true
            }
        })

        // COCKROACH PERSISTENCE: Register the trusted device
        await prisma.trustedDevice.upsert({
            where: { deviceId },
            update: {
                stationId: station.id,
                status: 'ACTIVE',
                lastSeenAt: new Date(),
                userAgent: meta?.userAgent || undefined
            },
            create: {
                deviceId,
                stationId: station.id,
                name: meta?.deviceName || "POS Register",
                userAgent: meta?.userAgent || undefined,
                status: 'ACTIVE'
            }
        })

        // Set Location to ACTIVE on first pairing
        if (station.location.provisioningStatus !== 'ACTIVE') {
            await prisma.location.update({
                where: { id: station.location.id },
                data: { provisioningStatus: 'ACTIVE' }
            })
        }

        const location = station.location
        const franchisor = location.franchise?.franchisor

        // ISSUE stationToken - this is the secure token for all future API calls
        const stationToken = issueStationToken(
            station.id,
            location.id,
            location.franchiseId,
            deviceId,
            station.name
        )

        console.log(`[PAIRING] Success: Station ${station.name} paired to device ${deviceId.slice(0, 8)}...`)

        return NextResponse.json({
            success: true,
            // stationToken is the KEY - client must store and send with all requests
            stationToken,
            business: {
                id: franchisor?.id || location.franchiseId,
                name: franchisor?.name || 'Business',
                industryType: franchisor?.industryType || 'RETAIL',
                logo: location.franchise?.settings?.storeLogo || null
            },
            location: {
                id: location.id,
                name: location.name
            },
            station: {
                id: station.id,
                name: station.name,
                pairingCode: station.pairingCode,
                paymentMode: station.paymentMode,
                dedicatedTerminal: station.dedicatedTerminal ? {
                    id: station.dedicatedTerminal.id,
                    name: station.dedicatedTerminal.name,
                    terminalIP: station.dedicatedTerminal.terminalIP,
                    terminalPort: station.dedicatedTerminal.terminalPort,
                    terminalType: station.dedicatedTerminal.terminalType
                } : null
            }
        })

    } catch (error) {
        console.error('Station code validation error:', error)
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
    }
}
