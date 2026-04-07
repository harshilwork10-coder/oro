import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET    /api/tobacco-scan/deals/[id] — Get single deal with stats
 * PUT    /api/tobacco-scan/deals/[id] — Update deal (status, dates, UPCs)
 * DELETE /api/tobacco-scan/deals/[id] — Soft-archive deal
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deal = await prisma.tobaccoScanDeal.findFirst({
      where: {
        id: params.id,
        franchiseId: user.franchiseId,
      },
      include: {
        eligibleUpcs: true,
        scanEvents: {
          orderBy: { soldAt: 'desc' },
          take: 50,
          select: {
            id: true,
            upc: true,
            qty: true,
            packOrCarton: true,
            regularPrice: true,
            discountApplied: true,
            reimbursementExpected: true,
            claimStatus: true,
            soldAt: true,
            storeId: true,
          },
        },
        _count: {
          select: { scanEvents: true },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Aggregate reimbursement stats
    const stats = await prisma.tobaccoScanEvent.groupBy({
      by: ['claimStatus'],
      where: { tobaccoDealId: deal.id },
      _sum: {
        discountApplied: true,
        reimbursementExpected: true,
        qty: true,
      },
      _count: true,
    })

    return NextResponse.json({
      deal,
      stats: {
        totalScans: deal._count.scanEvents,
        byClaimStatus: stats.map(s => ({
          status: s.claimStatus,
          count: s._count,
          totalQty: s._sum.qty || 0,
          totalDiscount: Number(s._sum.discountApplied || 0),
          totalReimbursement: Number(s._sum.reimbursementExpected || 0),
        })),
      },
    })
  } catch (error) {
    console.error('[TOBACCO_DEAL_GET]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      dealName,
      status,
      startDate,
      endDate,
      minQty,
      maxQty,
      customerLimitPerTxn,
      rewardValue,
      reimbursementPerUnit,
      storeIds,
      stackable,
      appliesToLevel,
      // UPC updates
      addUpcs,    // [{ upc, productName?, packOrCarton?, itemId? }]
      removeUpcs, // [upcId1, upcId2, ...]
    } = body

    // Verify deal belongs to franchise
    const existing = await prisma.tobaccoScanDeal.findFirst({
      where: { id: params.id, franchiseId: user.franchiseId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (dealName !== undefined) updateData.dealName = dealName
    if (status !== undefined) updateData.status = status
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (minQty !== undefined) updateData.minQty = minQty
    if (maxQty !== undefined) updateData.maxQty = maxQty
    if (customerLimitPerTxn !== undefined) updateData.customerLimitPerTxn = customerLimitPerTxn
    if (rewardValue !== undefined) updateData.rewardValue = rewardValue
    if (reimbursementPerUnit !== undefined) updateData.reimbursementPerUnit = reimbursementPerUnit
    if (storeIds !== undefined) updateData.storeIds = storeIds
    if (stackable !== undefined) updateData.stackable = stackable
    if (appliesToLevel !== undefined) updateData.appliesToLevel = appliesToLevel

    const result = await prisma.$transaction(async (tx) => {
      // Update deal
      const deal = await tx.tobaccoScanDeal.update({
        where: { id: params.id },
        data: updateData,
      })

      // Remove UPCs
      if (removeUpcs && removeUpcs.length > 0) {
        await tx.tobaccoScanDealUPC.deleteMany({
          where: {
            id: { in: removeUpcs },
            dealId: params.id,
          },
        })
      }

      // Add UPCs
      if (addUpcs && addUpcs.length > 0) {
        for (const u of addUpcs) {
          await tx.tobaccoScanDealUPC.upsert({
            where: { dealId_upc: { dealId: params.id, upc: u.upc } },
            update: {
              productName: u.productName || null,
              packOrCarton: u.packOrCarton || 'PACK',
              itemId: u.itemId || null,
            },
            create: {
              dealId: params.id,
              upc: u.upc,
              productName: u.productName || null,
              packOrCarton: u.packOrCarton || 'PACK',
              itemId: u.itemId || null,
            },
          })
        }
      }

      return tx.tobaccoScanDeal.findUnique({
        where: { id: params.id },
        include: { eligibleUpcs: true },
      })
    })

    return NextResponse.json({ deal: result })
  } catch (error) {
    console.error('[TOBACCO_DEAL_PUT]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.tobaccoScanDeal.findFirst({
      where: { id: params.id, franchiseId: user.franchiseId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Soft-archive: set status to ARCHIVED so scan events remain linked
    await prisma.tobaccoScanDeal.update({
      where: { id: params.id },
      data: { status: 'ARCHIVED' },
    })

    return NextResponse.json({ success: true, message: 'Deal archived' })
  } catch (error) {
    console.error('[TOBACCO_DEAL_DELETE]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}
