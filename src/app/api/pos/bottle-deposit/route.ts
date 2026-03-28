import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Bottle Deposit / CRV Calculator
 *
 * GET /api/pos/bottle-deposit?productIds[]=xxx — Calculate deposits for cart items
 * POST /api/pos/bottle-deposit — Update location deposit settings
 *
 * Uses existing schema fields:
 * - Location.bottleDepositEnabled / bottleDepositAmount
 * - Product.depositAmount (per-item override)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productIds = searchParams.getAll('productIds[]')

    try {
        // Get location deposit settings
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { locationId: true } })
        let location: any = null
        if (dbUser?.locationId) {
            location = await prisma.location.findUnique({
                where: { id: dbUser.locationId },
                select: { bottleDepositEnabled: true, bottleDepositAmount: true }
            })
        }

        if (!location?.bottleDepositEnabled) {
            return NextResponse.json({ enabled: false, totalDeposit: 0, items: [] })
        }

        const defaultDeposit = Number(location.bottleDepositAmount || 0.05)

        // If productIds provided, calculate per-item deposits
        if (productIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, depositAmount: true }
            })

            const items = products.map(p => ({
                productId: p.id,
                productName: p.name,
                depositAmount: p.depositAmount ? Number(p.depositAmount) : defaultDeposit,
                hasCustomDeposit: !!p.depositAmount
            }))

            const totalDeposit = items.reduce((s, i) => s + i.depositAmount, 0)

            return NextResponse.json({
                enabled: true,
                defaultDepositAmount: defaultDeposit,
                totalDeposit,
                items
            })
        }

        return NextResponse.json({
            enabled: true,
            defaultDepositAmount: defaultDeposit
        })
    } catch (error: any) {
        console.error('[BOTTLE_DEPOSIT_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only owners can update deposit settings
    if (!['OWNER', 'FRANCHISOR', 'PROVIDER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { locationId, enabled, depositAmount } = body

        if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

        await prisma.location.update({
            where: { id: locationId },
            data: {
                bottleDepositEnabled: enabled !== undefined ? enabled : true,
                bottleDepositAmount: depositAmount || 0.05
            }
        })

        return NextResponse.json({ success: true, enabled, depositAmount })
    } catch (error: any) {
        console.error('[BOTTLE_DEPOSIT_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
