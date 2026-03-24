// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

/**
 * No Sale API — Open drawer without a transaction
 * 
 * Logs the event for loss prevention. Every c-store POS has this.
 * Too many no-sales = suspicious activity (flagged in loss prevention).
 */

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await request.json()
        const reason = body.reason || 'No reason given'
        const stationId = body.stationId

        // Audit log for loss prevention tracking
        await auditLog({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'NO_SALE',
            entityType: 'CashDrawer',
            entityId: stationId || 'unknown',
            franchiseId,
            locationId: user.locationId,
            metadata: {
                reason,
                stationId,
                cashier: user.name || user.email,
            }
        })

        return NextResponse.json({
            success: true,
            drawerCommand: 'KICK',  // tells POS to send ESC/POS drawer kick
            logged: true,
            event: {
                type: 'NO_SALE',
                cashier: user.name || user.email,
                reason,
                timestamp: new Date().toISOString(),
            },
        })

    } catch (error) {
        console.error('No Sale error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
