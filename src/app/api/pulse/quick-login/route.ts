import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Generate a secure device token
function generateDeviceToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

// Lock duration after 5 failed attempts (15 minutes)
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const MAX_FAILED_ATTEMPTS = 5

/**
 * POST /api/pulse/quick-login
 * 
 * Three flows:
 * 1. PAIR: storeCode + pin + deviceId + deviceName → Create device token, return user session
 * 2. LOGIN: deviceToken + pin → Verify and return user session  
 * 3. REVOKE: deviceToken + action="revoke" → Revoke a device token
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { storeCode, pin, deviceId, deviceName, deviceToken, platform, action } = body

        // === FLOW 1: Device Pairing (first-time setup) ===
        if (storeCode && pin && deviceId) {
            return handleDevicePairing(storeCode, pin, deviceId, deviceName, platform)
        }

        // === FLOW 2: Quick Login with Device Token ===
        if (deviceToken && pin) {
            return handleQuickLogin(deviceToken, pin, request)
        }

        // === FLOW 3: Revoke Device Token ===
        if (deviceToken && action === 'revoke') {
            return handleRevoke(deviceToken)
        }

        return NextResponse.json({
            error: 'Invalid request. Provide (storeCode + pin + deviceId) for pairing, or (deviceToken + pin) for login.'
        }, { status: 400 })

    } catch (error) {
        console.error('Pulse quick-login error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * FLOW 1: Device Pairing
 * User enters store code + PIN on first launch
 */
async function handleDevicePairing(
    storeCode: string,
    pin: string,
    deviceId: string,
    deviceName?: string,
    platform?: string
) {
    // Find location by store code
    const location = await prisma.location.findUnique({
        where: { pulseStoreCode: storeCode.toUpperCase() },
        select: {
            id: true,
            name: true,
            franchiseId: true,
            franchise: {
                select: { franchisorId: true }
            }
        }
    })

    if (!location) {
        return NextResponse.json({
            error: 'Store not found. Check your store code.',
            code: 'INVALID_STORE_CODE'
        }, { status: 404 })
    }

    // Find employees at this location with Pulse access
    const employees = await prisma.user.findMany({
        where: {
            OR: [
                { locationId: location.id },
                { franchiseId: location.franchiseId }
            ],
            hasPulseAccess: true,
            pin: { not: null }
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            pin: true,
            locationId: true,
            franchiseId: true,
            failedLoginAttempts: true,
            lockedUntil: true
        }
    })

    if (employees.length === 0) {
        return NextResponse.json({
            error: 'No Pulse users found at this store. Ask your admin to assign Pulse access.',
            code: 'NO_PULSE_USERS'
        }, { status: 404 })
    }

    // Try to match PIN against employees
    let matchedUser = null
    for (const employee of employees) {
        // Check if locked
        if (employee.lockedUntil && new Date(employee.lockedUntil) > new Date()) {
            continue
        }

        if (employee.pin) {
            const isValid = await bcrypt.compare(pin, employee.pin)
            if (isValid) {
                matchedUser = employee
                break
            }
        }
    }

    if (!matchedUser) {
        return NextResponse.json({
            error: 'Invalid PIN',
            code: 'INVALID_PIN'
        }, { status: 401 })
    }

    // Generate device token
    const newToken = generateDeviceToken()
    const tokenHash = await bcrypt.hash(newToken, 10)

    // Create or update device token
    await prisma.pulseDeviceToken.upsert({
        where: {
            userId_deviceId: {
                userId: matchedUser.id,
                deviceId
            }
        },
        update: {
            tokenHash,
            deviceName: deviceName || null,
            platform: platform || null,
            isRevoked: false,
            revokedAt: null,
            revokedReason: null,
            failedAttempts: 0,
            lockedUntil: null,
            lastUsed: new Date()
        },
        create: {
            userId: matchedUser.id,
            deviceId,
            deviceName: deviceName || null,
            platform: platform || null,
            tokenHash
        }
    })

    // Reset failed login attempts on user
    await prisma.user.update({
        where: { id: matchedUser.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
    })

    return NextResponse.json({
        success: true,
        message: 'Device paired successfully',
        deviceToken: newToken, // Send to client to store locally
        user: {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role
        },
        location: {
            id: location.id,
            name: location.name
        }
    })
}

/**
 * FLOW 2: Quick Login with Device Token
 * Daily login with just PIN
 */
async function handleQuickLogin(deviceToken: string, pin: string, request: NextRequest) {
    // Find device tokens (we need to check the hash)
    const deviceTokens = await prisma.pulseDeviceToken.findMany({
        where: {
            isRevoked: false
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    pin: true,
                    hasPulseAccess: true,
                    locationId: true,
                    franchiseId: true,
                    location: { select: { id: true, name: true } }
                }
            }
        }
    })

    // Find matching token
    let matchedToken = null
    for (const token of deviceTokens) {
        const isValid = await bcrypt.compare(deviceToken, token.tokenHash)
        if (isValid) {
            matchedToken = token
            break
        }
    }

    if (!matchedToken) {
        return NextResponse.json({
            error: 'Device not recognized. Please pair again.',
            code: 'DEVICE_NOT_FOUND'
        }, { status: 401 })
    }

    // Check if token is locked (too many failed PIN attempts)
    if (matchedToken.lockedUntil && new Date(matchedToken.lockedUntil) > new Date()) {
        const remainingMs = new Date(matchedToken.lockedUntil).getTime() - Date.now()
        const remainingMin = Math.ceil(remainingMs / 60000)
        return NextResponse.json({
            error: `Too many failed attempts. Try again in ${remainingMin} minutes.`,
            code: 'LOCKED_OUT',
            remainingMinutes: remainingMin
        }, { status: 429 })
    }

    // Check user still has Pulse access
    if (!matchedToken.user.hasPulseAccess) {
        return NextResponse.json({
            error: 'Your Pulse access has been revoked. Contact your admin.',
            code: 'NO_ACCESS'
        }, { status: 403 })
    }

    // Verify PIN
    if (!matchedToken.user.pin) {
        return NextResponse.json({
            error: 'PIN not set. Please set up a PIN first.',
            code: 'NO_PIN'
        }, { status: 400 })
    }

    const isPinValid = await bcrypt.compare(pin, matchedToken.user.pin)

    if (!isPinValid) {
        // Increment failed attempts
        const newFailedAttempts = matchedToken.failedAttempts + 1
        const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS

        await prisma.pulseDeviceToken.update({
            where: { id: matchedToken.id },
            data: {
                failedAttempts: newFailedAttempts,
                lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null
            }
        })

        if (shouldLock) {
            return NextResponse.json({
                error: 'Too many failed attempts. Locked for 15 minutes.',
                code: 'LOCKED_OUT',
                remainingMinutes: 15
            }, { status: 429 })
        }

        return NextResponse.json({
            error: 'Invalid PIN',
            code: 'INVALID_PIN',
            attemptsRemaining: MAX_FAILED_ATTEMPTS - newFailedAttempts
        }, { status: 401 })
    }

    // Success! Update last used and reset attempts
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    await prisma.pulseDeviceToken.update({
        where: { id: matchedToken.id },
        data: {
            lastUsed: new Date(),
            lastIP: clientIP,
            failedAttempts: 0,
            lockedUntil: null
        }
    })

    return NextResponse.json({
        success: true,
        user: {
            id: matchedToken.user.id,
            email: matchedToken.user.email,
            name: matchedToken.user.name,
            role: matchedToken.user.role
        },
        location: matchedToken.user.location
    })
}

/**
 * FLOW 3: Revoke Device Token
 * Called when user logs out or admin revokes access
 */
async function handleRevoke(deviceToken: string) {
    // Find and revoke token
    const deviceTokens = await prisma.pulseDeviceToken.findMany({
        where: { isRevoked: false }
    })

    for (const token of deviceTokens) {
        const isValid = await bcrypt.compare(deviceToken, token.tokenHash)
        if (isValid) {
            await prisma.pulseDeviceToken.update({
                where: { id: token.id },
                data: {
                    isRevoked: true,
                    revokedAt: new Date(),
                    revokedReason: 'User logout'
                }
            })
            return NextResponse.json({ success: true, message: 'Device logged out' })
        }
    }

    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
}
