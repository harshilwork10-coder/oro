/**
 * MFA Status API Route
 * GET - Check if user has MFA enabled and if it's required
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import {
    isMFARequiredForRole,
    isMFARecommendedForRole,
    getBackupCodesCount
} from '@/lib/security/mfa'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

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

