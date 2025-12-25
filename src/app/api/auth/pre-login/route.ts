/**
 * Pre-Login API Route
 * Validates password and checks if MFA is required
 * Returns MFA requirement status without completing login
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compareSync } from 'bcryptjs'
import {
    checkAccountLockout,
    recordFailedLogin,
    resetFailedLogins,
    applyRateLimit,
    RATE_LIMITS
} from '@/lib/security'

export async function POST(req: Request) {
    try {
        // Rate limit login attempts
        const rateLimitResponse = await applyRateLimit(
            'pre-login',
            RATE_LIMITS.login
        )

        if (rateLimitResponse) {
            return rateLimitResponse
        }

        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Check account lockout
        const lockoutCheck = await checkAccountLockout(email)
        if (!lockoutCheck.allowed) {
            return NextResponse.json(
                { error: lockoutCheck.message, locked: true },
                { status: 423 }
            )
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                mfaEnabled: true
            }
        })

        if (!user || !user.password) {
            // Don't reveal if user exists
            await recordFailedLogin(email)
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Verify password
        const isPasswordValid = compareSync(password, user.password)

        if (!isPasswordValid) {
            const failResult = await recordFailedLogin(email)

            if (!failResult.allowed) {
                return NextResponse.json(
                    { error: failResult.message, locked: true },
                    { status: 423 }
                )
            }

            return NextResponse.json(
                {
                    error: 'Invalid email or password',
                    attemptsRemaining: failResult.attemptsRemaining
                },
                { status: 401 }
            )
        }

        // Password is valid - reset failed attempts
        await resetFailedLogins(email)

        // Check if MFA is enabled
        if (user.mfaEnabled) {
            return NextResponse.json({
                success: true,
                mfaRequired: true,
                userId: user.id,
                userName: user.name,
                message: 'Please enter your two-factor authentication code'
            })
        }

        // No MFA - password verified, can proceed with login
        return NextResponse.json({
            success: true,
            mfaRequired: false,
            message: 'Password verified'
        })

    } catch (error) {
        console.error('[Pre-Login] Error:', error)
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        )
    }
}
