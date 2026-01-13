import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// SECURITY: Rate limiting and lockout configuration
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10 // Max 10 attempts per minute per IP

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

// POST - PIN Login for employees (station-based)
// Terminal sends locationId, we only search employees at that location
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Get client IP for rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || 'unknown'

        // SECURITY: Check rate limit first
        const rateCheck = checkRateLimit(clientIP)
        if (!rateCheck.allowed) {
            return NextResponse.json({
                error: 'Too many login attempts. Please try again later.',
                retryAfter: rateCheck.retryAfter
            }, { status: 429 })
        }

        const body = await request.json()
        const { pin, locationId, employeeId } = body

        // SECURITY: Validate PIN format strictly
        if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
            return NextResponse.json({ error: 'Enter 4-digit PIN' }, { status: 400 })
        }

        // SECURITY: Require locationId to prevent global PIN search attack
        if (!locationId && !employeeId) {
            return NextResponse.json({
                error: 'Station not configured. Please contact admin.'
            }, { status: 400 })
        }

        // If employeeId is provided, verify PIN for that specific employee
        if (employeeId) {
            const employee = await prisma.user.findUnique({
                where: { id: employeeId },
                include: {
                    location: true,
                    franchise: {
                        include: { franchisor: true }
                    }
                }
            })

            if (!employee || !employee.pin) {
                return NextResponse.json({ error: 'Invalid employee' }, { status: 401 })
            }

            // SECURITY: Check if account is locked
            if (employee.lockedUntil && new Date(employee.lockedUntil) > new Date()) {
                const remainingMs = new Date(employee.lockedUntil).getTime() - Date.now()
                const remainingMin = Math.ceil(remainingMs / 60000)
                return NextResponse.json({
                    error: `Account locked. Try again in ${remainingMin} minutes.`,
                    lockedMinutes: remainingMin
                }, { status: 429 })
            }

            const isValid = await bcrypt.compare(pin, employee.pin)

            if (!isValid) {
                // SECURITY: Track failed attempts and lock if needed
                const newFailedAttempts = (employee.failedLoginAttempts || 0) + 1
                const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS

                await prisma.user.update({
                    where: { id: employee.id },
                    data: {
                        failedLoginAttempts: newFailedAttempts,
                        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null
                    }
                })

                if (shouldLock) {
                    return NextResponse.json({
                        error: 'Too many failed attempts. Account locked for 15 minutes.',
                        lockedMinutes: 15
                    }, { status: 429 })
                }

                return NextResponse.json({
                    error: 'Invalid PIN',
                    attemptsRemaining: MAX_FAILED_ATTEMPTS - newFailedAttempts
                }, { status: 401 })
            }

            // SECURITY: Reset failed attempts on success
            await prisma.user.update({
                where: { id: employee.id },
                data: { failedLoginAttempts: 0, lockedUntil: null }
            })

            return NextResponse.json({
                success: true,
                user: buildUserResponse(employee)
            })
        }

        // Build query based on locationId (station-based login)
        const whereClause: any = {
            role: 'EMPLOYEE',
            pin: { not: null },
            locationId: locationId // SECURITY: Now required
        }

        // Find employees at this location only
        const employees = await prisma.user.findMany({
            where: whereClause,
            include: {
                location: true,
                franchise: {
                    include: { franchisor: true }
                }
            }
        })

        // Check PIN against each employee and find match
        for (const employee of employees) {
            // SECURITY: Skip locked accounts
            if (employee.lockedUntil && new Date(employee.lockedUntil) > new Date()) {
                continue
            }

            if (employee.pin) {
                const isValid = await bcrypt.compare(pin, employee.pin)
                if (isValid) {
                    // Reset failed attempts on success
                    await prisma.user.update({
                        where: { id: employee.id },
                        data: { failedLoginAttempts: 0, lockedUntil: null }
                    })

                    return NextResponse.json({
                        success: true,
                        user: buildUserResponse(employee)
                    })
                }
            }
        }

        // SECURITY: Log failed attempt for all employees at location
        // (We don't know which one they were trying to log in as)
        console.error(`[SECURITY] Failed PIN login attempt at location ${locationId} from IP ${clientIP}`)

        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    } catch (error) {
        console.error('PIN login error:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}

// Helper to build user response
function buildUserResponse(employee: any) {
    const industryType = employee.franchise?.franchisor?.industryType || 'RETAIL'
    return {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        locationId: employee.locationId,
        franchiseId: employee.franchiseId,
        industryType: industryType
    }
}

