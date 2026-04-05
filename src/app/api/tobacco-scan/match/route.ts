import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { matchTobaccoDeals, type CartItem } from '@/lib/tobacco/scan-deal-matcher'

/**
 * POST /api/tobacco-scan/match
 *
 * Pre-checkout matching: given cart items with UPCs, returns which
 * TobaccoScanDeals apply and the discount per item.
 *
 * Called by POS at scan time so cashier/customer sees the discount before payment.
 * Does NOT create any database records — that happens post-checkout via /record-event.
 *
 * Body: { items: [{ upc, qty, price, packOrCarton }], storeId?: string }
 * Returns: { matches, totalDiscount, totalReimbursement }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { items, storeId } = body as {
      items: CartItem[]
      storeId?: string
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    // Resolve store ID from user context if not provided
    const resolvedStoreId = storeId || user.locationId || ''

    // Extract all UPCs from cart for efficient DB query
    const cartUpcs = items.map(i => i.upc).filter(Boolean)
    if (cartUpcs.length === 0) {
      return NextResponse.json({ matches: [], totalDiscount: 0, totalReimbursement: 0 })
    }

    const now = new Date()

    // Find all active deals that have at least one UPC matching the cart
    const activeDeals = await prisma.tobaccoScanDeal.findMany({
      where: {
        franchiseId: user.franchiseId,
        status: 'ACTIVE',
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
        eligibleUpcs: {
          some: {
            upc: { in: cartUpcs },
          },
        },
      },
      include: {
        eligibleUpcs: true,
      },
    })

    // Run the matching engine
    const result = matchTobaccoDeals(items, activeDeals, resolvedStoreId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[TOBACCO_MATCH]', error)
    return NextResponse.json({ error: 'Failed to match tobacco deals' }, { status: 500 })
  }
}
