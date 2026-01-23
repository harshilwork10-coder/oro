import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

// SECURITY: Rate limiting configuration
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

        const { phone, pin } = await request.json()

        if (!phone || !pin) {
            return NextResponse.json(
                { error: 'Phone and PIN are required' },
                { status: 400 }
            )
        }

        // Clean phone number (remove formatting)
        const cleanPhone = phone.replace(/\D/g, '')

        if (cleanPhone.length < 10) {
            return NextResponse.json(
                { error: 'Invalid phone number' },
                { status: 400 }
            )
        }

        if (pin.length !== 4) {
            return NextResponse.json(
                { error: 'PIN must be 4 digits' },
                { status: 400 }
            )
        }

        // Find user by phone number - try multiple formats
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: cleanPhone },
                    { phone: { contains: cleanPhone } },
                    { phone: { endsWith: cleanPhone.slice(-7) } } // Match last 7 digits
                ],
                isActive: true,
                role: 'EMPLOYEE'
            },
            include: {
                franchise: true,
                location: true
            }
        })

        if (!user) {
            // Try with formatted phone as well
            const formattedPhone = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
            const userWithFormat = await prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: cleanPhone },
                        { phone: formattedPhone }
                    ],
                    isActive: true,
                    role: 'EMPLOYEE'
                },
                include: {
                    franchise: true,
                    location: true
                }
            })

            if (!userWithFormat) {
                // Don't reveal if phone exists or not (security)
                return NextResponse.json(
                    { error: 'Invalid phone or PIN' },
                    { status: 401 }
                )
            }
        }

        const foundUser = user || await prisma.user.findFirst({
            where: {
                phone: { contains: cleanPhone },
                isActive: true,
                role: 'EMPLOYEE'
            },
            include: {
                franchise: true,
                location: true
            }
        })

        if (!foundUser) {
            return NextResponse.json(
                { error: 'Invalid phone or PIN' },
                { status: 401 }
            )
        }

        // Check if account is locked
        if (foundUser.lockedUntil && new Date(foundUser.lockedUntil) > new Date()) {
            const remainingMinutes = Math.ceil((new Date(foundUser.lockedUntil).getTime() - Date.now()) / 60000)
            return NextResponse.json(
                { error: `Account locked. Try again in ${remainingMinutes} minutes.` },
                { status: 423 }
            )
        }

        // Verify PIN
        if (!foundUser.pin) {
            return NextResponse.json(
                { error: 'PIN not set for this account' },
                { status: 401 }
            )
        }

        const pinValid = await compare(pin, foundUser.pin)
        if (!pinValid) {
            // Increment failed attempts
            const failedAttempts = (foundUser.failedLoginAttempts || 0) + 1
            const updateData: any = { failedLoginAttempts: failedAttempts }

            // Lock account if max attempts reached
            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                await prisma.user.update({
                    where: { id: foundUser.id },
                    data: updateData
                })
                return NextResponse.json(
                    { error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.` },
                    { status: 423 }
                )
            }

            await prisma.user.update({
                where: { id: foundUser.id },
                data: updateData
            })

            const attemptsLeft = MAX_FAILED_ATTEMPTS - failedAttempts

            // Special warning on last attempt
            if (attemptsLeft === 1) {
                return NextResponse.json(
                    {
                        error: `⚠️ LAST ATTEMPT! Invalid PIN. Contact your manager or support to reset your PIN before trying again.`,
                        warning: true
                    },
                    { status: 401 }
                )
            }

            return NextResponse.json(
                { error: `Invalid PIN. ${attemptsLeft} attempts remaining.` },
                { status: 401 }
            )
        }

        // Success! Reset failed attempts
        await prisma.user.update({
            where: { id: foundUser.id },
            data: { failedLoginAttempts: 0, lockedUntil: null }
        })

        // Return user info for session creation
        return NextResponse.json({
            success: true,
            user: {
                id: foundUser.id,
                email: foundUser.email,
                name: foundUser.name,
                role: foundUser.role,
                franchiseId: foundUser.franchiseId,
                locationId: foundUser.locationId,
                industryType: (foundUser.franchise as any)?.industryType || 'SERVICE'
            }
        })

    } catch (error) {
        console.error('Phone PIN login error:', error)
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        )
    }
}

