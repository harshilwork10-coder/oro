import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/tobacco-scan/deals — List all TobaccoScanDeals for franchise
 * POST /api/tobacco-scan/deals — Create a new TobaccoScanDeal with UPCs
 */

// ─── List Deals ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // ACTIVE, PAUSED, EXPIRED, etc.
    const manufacturer = searchParams.get('manufacturer') // ALTRIA, RJR, ITG

    const where: any = { franchiseId: user.franchiseId }
    if (status) where.status = status
    if (manufacturer) where.manufacturer = manufacturer

    const deals = await prisma.tobaccoScanDeal.findMany({
      where,
      include: {
        eligibleUpcs: true,
        _count: {
          select: { scanEvents: true },
        },
      },
      orderBy: [
        { status: 'asc' },  // ACTIVE first
        { startDate: 'desc' },
      ],
    })

    // Enrich with scan event stats per deal
    const enriched = deals.map((deal) => ({
      ...deal,
      upcCount: deal.eligibleUpcs.length,
      totalScans: deal._count.scanEvents,
    }))

    return NextResponse.json({ deals: enriched })
  } catch (error) {
    console.error('[TOBACCO_DEALS_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch tobacco deals' }, { status: 500 })
  }
}

// ─── Create Deal ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      manufacturer,
      programCode,
      dealName,
      type = 'BUYDOWN',
      appliesToLevel = 'PACK',
      minQty = 1,
      maxQty,
      customerLimitPerTxn,
      rewardType = 'FIXED_AMOUNT',
      rewardValue,
      reimbursementPerUnit,
      storeIds = [],
      startDate,
      endDate,
      status = 'ACTIVE',
      requiresScanReporting = true,
      stackable = false,
      manufacturerPLU,
      sourceFile,
      // UPC list
      upcs = [],  // [{ upc, productName?, packOrCarton?, itemId? }]
    } = body

    // Validation
    if (!manufacturer || !dealName || rewardValue === undefined) {
      return NextResponse.json({
        error: 'manufacturer, dealName, and rewardValue are required',
      }, { status: 400 })
    }

    if (!startDate) {
      return NextResponse.json({
        error: 'startDate is required',
      }, { status: 400 })
    }

    const deal = await prisma.tobaccoScanDeal.create({
      data: {
        franchiseId: user.franchiseId,
        manufacturer,
        programCode: programCode || null,
        dealName,
        type,
        appliesToLevel,
        minQty,
        maxQty: maxQty || null,
        customerLimitPerTxn: customerLimitPerTxn || null,
        rewardType,
        rewardValue,
        reimbursementPerUnit: reimbursementPerUnit ?? rewardValue, // Default: same as discount
        storeIds,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        requiresScanReporting,
        stackable,
        manufacturerPLU: manufacturerPLU || null,
        sourceFile: sourceFile || null,
        // Create UPC entries
        eligibleUpcs: upcs.length > 0 ? {
          create: upcs.map((u: any) => ({
            upc: u.upc,
            productName: u.productName || null,
            packOrCarton: u.packOrCarton || 'PACK',
            itemId: u.itemId || null,
          })),
        } : undefined,
      },
      include: {
        eligibleUpcs: true,
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('[TOBACCO_DEALS_POST]', error)
    return NextResponse.json({ error: 'Failed to create tobacco deal' }, { status: 500 })
  }
}
