import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get current account status for logged-in user
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: {
                accountStatus: true,
                suspendedReason: true,
                scheduledDeletionAt: true,
                dataExportedAt: true
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        return NextResponse.json({
            status: franchise.accountStatus,
            suspendedReason: franchise.suspendedReason,
            scheduledDeletionAt: franchise.scheduledDeletionAt?.toISOString(),
            dataExportedAt: franchise.dataExportedAt?.toISOString()
        })

    } catch (error) {
        console.error('Account status error:', error)
        return NextResponse.json({ error: 'Failed to get account status' }, { status: 500 })
    }
}

