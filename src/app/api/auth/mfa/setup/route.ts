/**
 * MFA Setup API Route
 * GET - Get MFA setup QR code and backup codes
 * POST - Enable MFA after verifying initial code
 * DELETE - Disable MFA
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    generateMFASetup,
    verifyMFAToken,
    isMFARequiredForRole
} from '@/lib/security/mfa'

// GET - Generate MFA setup (QR code + backup codes)
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
            select: { email: true, mfaEnabled: true }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // If already enabled, don't regenerate
        if (user.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA is already enabled', mfaEnabled: true },
                { status: 400 }
            )
        }

        // Generate new MFA setup
        const setup = await generateMFASetup(user.email)

        // Store the encrypted secret temporarily (not enabled until verified)
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                mfaSecret: setup.secret,
                mfaBackupCodes: setup.encryptedBackupCodes
            }
        })

        return NextResponse.json({
            qrCode: setup.qrCodeDataUrl,
            backupCodes: setup.backupCodes, // Show once during setup
            message: 'Scan QR code with your authenticator app, then verify with a code'
        })

    } catch (error) {
        console.error('[MFA Setup] Error:', error)
        return NextResponse.json(
            { error: 'Failed to generate MFA setup' },
            { status: 500 }
        )
    }
}

// POST - Verify and enable MFA
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

        if (!token || typeof token !== 'string' || token.length !== 6) {
            return NextResponse.json(
                { error: 'Invalid verification code. Enter 6 digits from your authenticator.' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaSecret: true, mfaEnabled: true }
        })

        if (!user?.mfaSecret) {
            return NextResponse.json(
                { error: 'MFA not configured. Start setup first.' },
                { status: 400 }
            )
        }

        if (user.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA is already enabled' },
                { status: 400 }
            )
        }

        // Verify the token
        const isValid = verifyMFAToken(token, user.mfaSecret)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid code. Please try again.' },
                { status: 400 }
            )
        }

        // Enable MFA
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                mfaEnabled: true,
                mfaSetupAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            message: 'MFA enabled successfully! Your account is now protected.'
        })

    } catch (error) {
        console.error('[MFA Enable] Error:', error)
        return NextResponse.json(
            { error: 'Failed to enable MFA' },
            { status: 500 }
        )
    }
}

// DELETE - Disable MFA (requires current MFA code)
export async function DELETE(req: Request) {
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
                { error: 'MFA code required to disable' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaSecret: true, mfaEnabled: true, role: true }
        })

        if (!user?.mfaEnabled) {
            return NextResponse.json(
                { error: 'MFA is not enabled' },
                { status: 400 }
            )
        }

        // Check if MFA is required for this role
        if (isMFARequiredForRole(user.role)) {
            return NextResponse.json(
                { error: 'MFA cannot be disabled for your role. Contact support.' },
                { status: 403 }
            )
        }

        // Verify current MFA code
        const isValid = verifyMFAToken(token, user.mfaSecret!)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid MFA code' },
                { status: 400 }
            )
        }

        // Disable MFA
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                mfaBackupCodes: null,
                mfaSetupAt: null
            }
        })

        return NextResponse.json({
            success: true,
            message: 'MFA has been disabled'
        })

    } catch (error) {
        console.error('[MFA Disable] Error:', error)
        return NextResponse.json(
            { error: 'Failed to disable MFA' },
            { status: 500 }
        )
    }
}

