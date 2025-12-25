/**
 * User Account Deletion API Route
 * GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteUserData, getPrivacyDashboard } from '@/lib/security/gdpr'
import { logActivity } from '@/lib/auditLog'

// GET - Check deletion eligibility and get privacy dashboard
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const dashboard = await getPrivacyDashboard(userId)

        return NextResponse.json({
            canDelete: true, // Would include actual eligibility check
            dashboard
        })

    } catch (error) {
        console.error('[Delete Account] Error fetching status:', error)
        return NextResponse.json(
            { error: 'Failed to fetch deletion status' },
            { status: 500 }
        )
    }
}

// POST - Request account deletion
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const body = await request.json()

        // Require confirmation
        if (body.confirmation !== 'DELETE_MY_ACCOUNT') {
            return NextResponse.json(
                { error: 'Please confirm deletion by providing confirmation code' },
                { status: 400 }
            )
        }

        // Determine deletion type
        const anonymize = body.type === 'anonymize'
        const hardDelete = body.type === 'permanent'

        // Log the deletion request before executing
        await logActivity({
            userId,
            action: 'ACCOUNT_DELETION_REQUEST',
            entityType: 'USER',
            entityId: userId,
            details: {
                type: body.type,
                reason: body.reason,
                timestamp: new Date().toISOString()
            }
        })

        // Execute deletion
        const result = await deleteUserData(userId, userId, {
            anonymize,
            hardDelete
        })

        if (!result.success) {
            return NextResponse.json({
                success: false,
                errors: result.errors,
                message: result.errors[0] || 'Deletion failed'
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            deletedRecords: result.deletedRecords,
            message: anonymize
                ? 'Your account has been anonymized. Personal data has been removed.'
                : 'Your account has been scheduled for deletion.',
            nextSteps: [
                'You will be logged out automatically.',
                'If you have any questions, contact support.'
            ]
        })

    } catch (error) {
        console.error('[Delete Account] Error:', error)
        return NextResponse.json(
            { error: 'Failed to process deletion request' },
            { status: 500 }
        )
    }
}
