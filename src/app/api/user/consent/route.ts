/**
 * User Consent Management API Route
 * GDPR Articles 6-7 - Lawful Basis and Conditions for Consent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
    recordConsent,
    getUserConsents,
    revokeConsent,
    revokeAllConsents,
    ConsentType
} from '@/lib/security/gdpr'
import { logActivity } from '@/lib/auditLog'

const VALID_CONSENT_TYPES: ConsentType[] = [
    'MARKETING_EMAIL',
    'MARKETING_SMS',
    'ANALYTICS',
    'PERSONALIZATION',
    'THIRD_PARTY_SHARING',
    'PUSH_NOTIFICATIONS'
]

// GET - Get all consent preferences for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const consents = getUserConsents(session.user.id)

        // Build a complete preference map
        const preferences: Record<ConsentType, boolean> = {} as Record<ConsentType, boolean>
        for (const type of VALID_CONSENT_TYPES) {
            const consent = consents.find(c => c.consentType === type)
            preferences[type] = consent?.granted ?? false
        }

        return NextResponse.json({
            userId: session.user.id,
            preferences,
            consents: consents.map(c => ({
                type: c.consentType,
                granted: c.granted,
                grantedAt: c.grantedAt,
                revokedAt: c.revokedAt,
                source: c.source,
                version: c.version
            })),
            lastUpdated: consents.length > 0
                ? new Date(Math.max(...consents.map(c =>
                    (c.grantedAt || c.revokedAt || new Date(0)).getTime()
                )))
                : null
        })

    } catch (error) {
        console.error('[Consent] Error fetching:', error)
        return NextResponse.json(
            { error: 'Failed to fetch consent preferences' },
            { status: 500 }
        )
    }
}

// PUT - Update consent preferences
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { preferences } = body

        if (!preferences || typeof preferences !== 'object') {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            )
        }

        const userId = session.user.id
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const updatedConsents = []

        for (const [type, granted] of Object.entries(preferences)) {
            if (!VALID_CONSENT_TYPES.includes(type as ConsentType)) {
                continue // Skip invalid consent types
            }

            if (typeof granted !== 'boolean') {
                continue // Skip invalid values
            }

            const consent = recordConsent(
                userId,
                type as ConsentType,
                granted,
                'WEB',
                ip,
                '1.0'
            )
            updatedConsents.push(consent)
        }

        // Log consent changes
        await logActivity({
            userId,
            action: 'CONSENT_UPDATED',
            entityType: 'USER',
            entityId: userId,
            details: {
                updatedCount: updatedConsents.length,
                preferences
            }
        })

        return NextResponse.json({
            success: true,
            updatedCount: updatedConsents.length,
            message: 'Consent preferences updated successfully'
        })

    } catch (error) {
        console.error('[Consent] Error updating:', error)
        return NextResponse.json(
            { error: 'Failed to update consent preferences' },
            { status: 500 }
        )
    }
}

// DELETE - Revoke all consents (opt-out of everything)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id
        const revokedCount = revokeAllConsents(userId, 'WEB')

        // Log consent revocation
        await logActivity({
            userId,
            action: 'ALL_CONSENTS_REVOKED',
            entityType: 'USER',
            entityId: userId,
            details: { revokedCount }
        })

        return NextResponse.json({
            success: true,
            revokedCount,
            message: 'All consent preferences have been revoked'
        })

    } catch (error) {
        console.error('[Consent] Error revoking:', error)
        return NextResponse.json(
            { error: 'Failed to revoke consents' },
            { status: 500 }
        )
    }
}

