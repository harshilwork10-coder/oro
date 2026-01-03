/**
 * MFA Status API Route
 * GET - Check if user has MFA enabled and if it's required
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    isMFARequiredForRole,
    isMFARecommendedForRole,
    getBackupCodesCount
} from '@/lib/security/mfa'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                mfaEnabled: true,
                mfaBackupCodes: true,
                mfaSetupAt: true
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        const backupCodesRemaining = getBackupCodesCount(user.mfaBackupCodes)
        const isRequired = isMFARequiredForRole(user.role)
        const isRecommended = isMFARecommendedForRole(user.role)

        return NextResponse.json({
            mfaEnabled: user.mfaEnabled,
            mfaSetupAt: user.mfaSetupAt,
            backupCodesRemaining,
            isRequired,
            isRecommended,
            lowBackupCodes: backupCodesRemaining > 0 && backupCodesRemaining <= 2
        })

    } catch (error) {
        console.error('[MFA Status] Error:', error)
        return NextResponse.json(
            { error: 'Failed to get MFA status' },
            { status: 500 }
        )
    }
}

