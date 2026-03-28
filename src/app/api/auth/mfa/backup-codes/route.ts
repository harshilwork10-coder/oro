/**
 * MFA Backup Codes Regeneration API Route
 * POST - Generate new backup codes (requires MFA verification)
 */

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { verifyMFAToken, regenerateBackupCodes } from '@/lib/security/mfa'
import { logActivity } from '@/lib/auditLog'

export async function POST(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
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
            where: { id: user.id },
            data: { mfaBackupCodes: encryptedBackupCodes }
        })

        // Debug log removed

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role || 'USER',
            action: 'MFA_BACKUP_CODES_REGENERATED',
            entityType: 'User',
            entityId: user.id,
            metadata: {}
        })

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

