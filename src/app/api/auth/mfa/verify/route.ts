/**
 * MFA Verification API Route
 * Used during login to verify MFA token
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    verifyMFAWithBackup,
    removeUsedBackupCode
} from '@/lib/security/mfa'
import { applyRateLimit, RATE_LIMITS } from '@/lib/security'

export async function POST(req: Request) {
    try {
        // Rate limit MFA verification attempts
        const rateLimitResponse = await applyRateLimit(
            'mfa-verify',
            RATE_LIMITS.login
        )

        if (rateLimitResponse) {
            return rateLimitResponse
        }

        const { userId, token } = await req.json()

        if (!userId || !token) {
            return NextResponse.json(
                { error: 'User ID and MFA token are required' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                mfaEnabled: true,
                mfaSecret: true,
                mfaBackupCodes: true
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        if (!user.mfaEnabled || !user.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA is not enabled for this account' },
                { status: 400 }
            )
        }

        // Verify token (supports both TOTP and backup codes)
        const result = verifyMFAWithBackup(
            token,
            user.mfaSecret,
            user.mfaBackupCodes
        )

        if (!result.valid) {
            return NextResponse.json(
                { error: 'Invalid MFA code' },
                { status: 401 }
            )
        }

        // If backup code was used, remove it
        if (result.usedBackupCode && user.mfaBackupCodes) {
            const updatedBackupCodes = removeUsedBackupCode(token, user.mfaBackupCodes)
            await prisma.user.update({
                where: { id: userId },
                data: { mfaBackupCodes: updatedBackupCodes }
            })
        }

        return NextResponse.json({
            success: true,
            usedBackupCode: result.usedBackupCode,
            message: result.usedBackupCode
                ? 'Logged in with backup code. Consider generating new backup codes.'
                : 'MFA verification successful'
        })

    } catch (error) {
        console.error('[MFA Verify] Error:', error)
        return NextResponse.json(
            { error: 'MFA verification failed' },
            { status: 500 }
        )
    }
}

