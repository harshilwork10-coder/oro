import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tobacco-scan/rebate-estimate
 *
 * Returns the reimbursement pipeline using REAL TobaccoScanEvent data.
 * Shows unclaimed, exported, submitted, and paid totals.
 */
export async function GET(req: NextRequest) {
  const emptyResponse = {
    pipeline: {
      unclaimed: { count: 0, qty: 0, discount: 0, reimbursement: 0 },
      exported: { count: 0, qty: 0, discount: 0, reimbursement: 0 },
      submitted: { count: 0, qty: 0, discount: 0, reimbursement: 0 },
      paid: { count: 0, qty: 0, discount: 0, reimbursement: 0 },
      denied: { count: 0, qty: 0, discount: 0, reimbursement: 0 },
    },
    weekly: { scanCount: 0, totalQty: 0, totalDiscount: 0, totalReimbursement: 0 },
    monthly: { scanCount: 0, totalQty: 0, totalDiscount: 0, totalReimbursement: 0, loyaltyBonus: 0 },
    activeDeals: 0,
    configuredManufacturers: 0,
  }

  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Get current week range
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    // Get current month range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    try {
      // Reimbursement pipeline by claim status (ALL TIME)
      const pipeline = await prisma.tobaccoScanEvent.groupBy({
        by: ['claimStatus'],
        where: {
          tobaccoDeal: { franchiseId: user.franchiseId },
        },
        _sum: {
          discountApplied: true,
          reimbursementExpected: true,
          qty: true,
        },
        _count: true,
      })

      const pipelineMap: Record<string, { count: number; qty: number; discount: number; reimbursement: number }> = {}
      for (const row of pipeline) {
        pipelineMap[row.claimStatus] = {
          count: row._count,
          qty: row._sum.qty || 0,
          discount: Number(row._sum.discountApplied || 0),
          reimbursement: Number(row._sum.reimbursementExpected || 0),
        }
      }

      const weeklyStats = await prisma.tobaccoScanEvent.aggregate({
        where: {
          tobaccoDeal: { franchiseId: user.franchiseId },
          soldAt: { gte: startOfWeek, lte: endOfWeek },
        },
        _sum: { discountApplied: true, reimbursementExpected: true, qty: true },
        _count: true,
      })

      const monthlyStats = await prisma.tobaccoScanEvent.aggregate({
        where: {
          tobaccoDeal: { franchiseId: user.franchiseId },
          soldAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { discountApplied: true, reimbursementExpected: true, qty: true },
        _count: true,
      })

      const activeDeals = await prisma.tobaccoScanDeal.count({
        where: {
          franchiseId: user.franchiseId,
          status: 'ACTIVE',
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      })

      const configs = await prisma.manufacturerConfig.findMany({
        where: { franchiseId: user.franchiseId, isActive: true },
      })

      const totalLoyaltyBonus = configs.reduce((s, c) => s + Number(c.loyaltyBonus || 0), 0)

      return NextResponse.json({
        pipeline: {
          unclaimed: pipelineMap['UNCLAIMED'] || emptyResponse.pipeline.unclaimed,
          exported: pipelineMap['EXPORTED'] || emptyResponse.pipeline.exported,
          submitted: pipelineMap['SUBMITTED'] || emptyResponse.pipeline.submitted,
          paid: pipelineMap['PAID'] || emptyResponse.pipeline.paid,
          denied: pipelineMap['DENIED'] || emptyResponse.pipeline.denied,
        },
        weekly: {
          scanCount: weeklyStats._count,
          totalQty: weeklyStats._sum.qty || 0,
          totalDiscount: Number(weeklyStats._sum.discountApplied || 0),
          totalReimbursement: Number(weeklyStats._sum.reimbursementExpected || 0),
        },
        monthly: {
          scanCount: monthlyStats._count,
          totalQty: monthlyStats._sum.qty || 0,
          totalDiscount: Number(monthlyStats._sum.discountApplied || 0),
          totalReimbursement: Number(monthlyStats._sum.reimbursementExpected || 0),
          loyaltyBonus: totalLoyaltyBonus,
        },
        activeDeals,
        configuredManufacturers: configs.length,
      })
    } catch (dbErr: any) {
      console.warn('[TOBACCO_REBATE_ESTIMATE] DB query failed:', dbErr?.message?.slice(0, 120))
      return NextResponse.json(emptyResponse)
    }
  } catch (error) {
    console.error('[TOBACCO_REBATE_ESTIMATE]', error)
    return NextResponse.json(emptyResponse)
  }
}
