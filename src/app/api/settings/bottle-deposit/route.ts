import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Bottle Deposit / CRV Configuration
 * GET /api/settings/bottle-deposit — Current config + state info
 * PUT /api/settings/bottle-deposit — Update (Owner+ only)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const location = await prisma.location.findUnique({
            where: { id: user.locationId },
            select: { bottleDepositEnabled: true, bottleDepositAmount: true, state: true }
        })
        if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

        const bottleBillStates = ['CA', 'CT', 'HI', 'IA', 'MA', 'ME', 'MI', 'NY', 'OR', 'VT']
        const stateCode = (location.state || '').toUpperCase()
        const stateRates: Record<string, number> = {
            CA: 0.05, CT: 0.05, HI: 0.05, IA: 0.05, MA: 0.05,
            ME: 0.05, MI: 0.10, NY: 0.05, OR: 0.10, VT: 0.05
        }

        return NextResponse.json({
            enabled: location.bottleDepositEnabled,
            amount: location.bottleDepositAmount ? Number(location.bottleDepositAmount) : null,
            stateHasBottleBill: bottleBillStates.includes(stateCode),
            state: location.state,
            suggestedRate: stateRates[stateCode] || 0.05,
            bottleBillStates
        })
    } catch (error: any) {
        console.error('[BOTTLE_DEPOSIT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch bottle deposit config' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { enabled, amount } = await req.json()

        await prisma.location.update({
            where: { id: user.locationId },
            data: {
                bottleDepositEnabled: enabled ?? false,
                bottleDepositAmount: amount != null ? amount : null
            }
        })

        return NextResponse.json({ updated: true })
    } catch (error: any) {
        console.error('[BOTTLE_DEPOSIT_PUT]', error)
        return NextResponse.json({ error: 'Failed to update bottle deposit config' }, { status: 500 })
    }
}
