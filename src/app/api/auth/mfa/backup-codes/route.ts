/**
 * MFA Backup Codes Regeneration API Route
 * POST - Generate new backup codes (requires MFA verification)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyMFAToken, regenerateBackupCodes } from '@/lib/security/mfa'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { token } = await req.json()

        if (!token) {
            return NextResponse.json(
                { error: 'Current MFA code required to generate new backup codes' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaEnabled: true, mfaSecret: true }
        })

        if (!user?.mfaEnabled || !user.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA is not enabled' },
                { status: 400 }
            )
        }

        // Verify current MFA code
        const isValid = verifyMFAToken(token, user.mfaSecret)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid MFA code' },
                { status: 401 }
            )
        }

        // Generate new backup codes
        const { backupCodes, encryptedBackupCodes } = regenerateBackupCodes()

        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaBackupCodes: encryptedBackupCodes }
        })

        console.log(`[MFA] Backup codes regenerated for user ${session.user.id}`)

        return NextResponse.json({
            success: true,
            backupCodes, // Show once - user must save these
            message: 'New backup codes generated. Save these securely - they will not be shown again.'
        })

    } catch (error) {
        console.error('[MFA Backup Codes] Error:', error)
        return NextResponse.json(
            { error: 'Failed to regenerate backup codes' },
            { status: 500 }
        )
    }
}
