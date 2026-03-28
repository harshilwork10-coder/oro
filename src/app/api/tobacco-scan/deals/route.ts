import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/tobacco-scan/deals - List all tobacco deals
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const deals = await prisma.tobaccoDeal.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }]
        })

        return NextResponse.json({ deals })
    } catch (error) {
        console.error('Failed to fetch tobacco deals:', error)
        return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }
}

// POST /api/tobacco-scan/deals - Create new tobacco deal
export async function POST(request: Request) {
    try {
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            manufacturer,
            dealName,
            dealType,
            buyQuantity,
            getFreeQuantity,
            discountType,
            discountAmount,
            applicableUpcs,
            startDate,
            endDate
        } = body

        if (!dealName || !dealType || !discountType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // For penny deals, set discount to 0.01 (item price - 0.01 is the discount)
        const finalDiscountAmount = dealType === 'PENNY_DEAL' ? 0.01 : (discountAmount || 0)

        const deal = await prisma.tobaccoDeal.create({
            data: {
                franchiseId: user.franchiseId,
                manufacturer: manufacturer || 'ALL',
                dealName,
                dealType,
                buyQuantity: buyQuantity || null,
                getFreeQuantity: getFreeQuantity || null,
                discountType: dealType === 'PENNY_DEAL' ? 'PENNY' : discountType,
                discountAmount: finalDiscountAmount,
                applicableUpcs: applicableUpcs || null,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                isActive: true
            }
        })

        return NextResponse.json({ deal })
    } catch (error) {
        console.error('Failed to create tobacco deal:', error)
        return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }
}

