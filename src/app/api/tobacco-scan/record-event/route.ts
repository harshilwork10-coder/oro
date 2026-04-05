import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { classifyLine, hashLoyaltyId } from '@/lib/tobacco/rmsc-parser'

/**
 * POST /api/tobacco-scan/record-event
 *
 * Post-checkout commit: creates TobaccoScanEvent ledger rows
 * ONLY after a sale is COMPLETED. Captures all 7 RMSC discount
 * channels for industry-standard export.
 *
 * NEVER call for abandoned/voided/suspended carts.
 *
 * Body: {
 *   transactionId: string,
 *   storeId: string,
 *   stationId?: string,
 *   cashierId?: string,
 *   events: [{
 *     dealId?: string,        // nullable for normal sales
 *     lineItemId?: string,
 *     lineNumber: number,     // position in transaction
 *     upc: string,
 *     upcDescription?: string,
 *     qty: number,            // SIGNED — negative for returns
 *     unitOfMeasure: string,  // PACK|CARTON|CAN|ROLL|TIN|SLEEVE
 *     regularPrice: number,   // shelf price pre-discount
 *     sellingPrice: number,   // per-unit post-all-discounts
 *     // 7 discount channels
 *     outletMultipackFlag?: boolean,
 *     outletMultipackQty?: number,
 *     outletMultipackDisc?: number,
 *     acctPromoName?: string,
 *     acctDiscAmt?: number,
 *     mfgDiscAmt?: number,
 *     pidCoupon?: string,
 *     pidCouponDisc?: number,
 *     mfgMultipackFlag?: boolean,
 *     mfgMultipackQty?: number,
 *     mfgMultipackDisc?: number,
 *     mfgPromoDesc?: string,
 *     mfgBuydownDesc?: string,
 *     mfgBuydownAmt?: number,
 *     mfgMultipackDesc?: string,
 *     loyaltyId?: string,     // will be hashed
 *     offerCode?: string,
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { transactionId, storeId, stationId, cashierId, events } = body

    if (!transactionId || !storeId || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({
        error: 'transactionId, storeId, and events[] required',
      }, { status: 400 })
    }

    // Verify the transaction exists and is COMPLETED
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        franchiseId: user.franchiseId,
        status: 'COMPLETED',
      },
    })

    if (!transaction) {
      return NextResponse.json({
        error: 'Transaction not found or not completed. Scan events are only created for completed sales.',
      }, { status: 400 })
    }

    // Verify referenced deals exist (if any) and load loyalty requirements
    const dealIds = [...new Set(events.map((e: any) => e.dealId).filter(Boolean))]
    const dealsMap = new Map<string, { id: string; requiresLoyalty: boolean }>()
    if (dealIds.length > 0) {
      const deals = await prisma.tobaccoScanDeal.findMany({
        where: { id: { in: dealIds }, franchiseId: user.franchiseId },
        select: { id: true, requiresLoyalty: true },
      })
      for (const d of deals) dealsMap.set(d.id, d)
      const invalidDeals = dealIds.filter((id: string) => !dealsMap.has(id))
      if (invalidDeals.length > 0) {
        return NextResponse.json({
          error: `Invalid deal IDs: ${invalidDeals.join(', ')}`,
        }, { status: 400 })
      }
    }

    // Idempotency check
    const existingEvents = await prisma.tobaccoScanEvent.count({
      where: { transactionId },
    })
    if (existingEvents > 0) {
      return NextResponse.json({
        error: 'Scan events already recorded for this transaction',
        existingCount: existingEvents,
      }, { status: 409 })
    }

    // Detect void pairs within the same transaction
    const upcCounts = new Map<string, { positive: number; negative: number }>()
    for (const e of events) {
      const key = e.upc
      const entry = upcCounts.get(key) || { positive: 0, negative: 0 }
      if (e.qty < 0) entry.negative += Math.abs(e.qty)
      else entry.positive += e.qty
      upcCounts.set(key, entry)
    }

    // Create all scan events atomically
    const result = await prisma.$transaction(async (tx) => {
      const created = []

      for (const event of events) {
        // Classify line type
        const lineType = classifyLine({
          quantity: event.qty,
          upcDescription: event.upcDescription,
          mfgMultipackFlag: event.mfgMultipackFlag,
          outletMultipackFlag: event.outletMultipackFlag,
          mfgDiscAmt: event.mfgDiscAmt,
          mfgPromoDesc: event.mfgPromoDesc,
          pidCoupon: event.pidCoupon,
          loyaltyId: event.loyaltyId,
          pidCouponDisc: event.pidCouponDisc,
        })

        // Promo UPC detection
        const isPromoUpc = /\$\d+\.?\d*\s*OFF/i.test(event.upcDescription || '')

        // Claim eligibility
        let claimEligible = true
        let exclusionReason: string | null = null

        if (isPromoUpc) {
          claimEligible = false
          exclusionReason = 'PROMO_UPC_PREPRICED'
        } else if (event.qty < 0) {
          claimEligible = false
          exclusionReason = 'RETURN_VOID'
          // Check if void pair (same UPC has positive qty in this batch)
          const upcEntry = upcCounts.get(event.upc)
          if (upcEntry && upcEntry.positive > 0) {
            exclusionReason = 'RETURN_VOID'
          } else {
            exclusionReason = 'EXCHANGE_RETURN'
          }
        }

        // Has any customer-visible promo
        const promoFlag = (event.outletMultipackFlag === true) ||
          (event.mfgMultipackFlag === true) ||
          (event.mfgDiscAmt || 0) > 0 ||
          (event.pidCouponDisc || 0) > 0 ||
          (event.acctDiscAmt || 0) > 0

        // Compute derived totals
        const discountApplied =
          (event.outletMultipackDisc || 0) +
          (event.acctDiscAmt || 0) +
          (event.mfgDiscAmt || 0) +
          (event.pidCouponDisc || 0) +
          (event.mfgMultipackDisc || 0)

        const reimbursementExpected =
          (event.mfgBuydownAmt || 0) +
          (event.mfgMultipackDisc || 0) +
          (event.mfgDiscAmt || 0)

        const scanEvent = await tx.tobaccoScanEvent.create({
          data: {
            tobaccoDealId: event.dealId || null,
            transactionId,
            lineItemId: event.lineItemId || null,

            lineType,
            lineNumber: event.lineNumber || 1,
            claimEligible,
            exclusionReason,

            storeId,
            stationId: stationId || null,
            cashierId: cashierId || user.id,

            soldAt: transaction.createdAt,
            upc: event.upc,
            upcDescription: event.upcDescription || null,
            qty: event.qty || 1,
            unitOfMeasure: event.unitOfMeasure || 'PACK',

            promoFlag,
            isPromoUpc,

            regularPrice: event.regularPrice,
            sellingPrice: event.sellingPrice ?? event.regularPrice,

            // Channel 1: Outlet multipack
            outletMultipackFlag: event.outletMultipackFlag || false,
            outletMultipackQty: event.outletMultipackQty || null,
            outletMultipackDisc: event.outletMultipackDisc || 0,

            // Channel 2: Account promo
            acctPromoName: event.acctPromoName || null,
            acctDiscAmt: event.acctDiscAmt || 0,

            // Channel 3: Mfg discount (JBF/VAP)
            mfgDiscAmt: event.mfgDiscAmt || 0,

            // Channel 4: PID coupon
            pidCoupon: event.pidCoupon || null,
            pidCouponDisc: event.pidCouponDisc || 0,

            // Channel 5: Mfg multipack
            mfgMultipackFlag: event.mfgMultipackFlag || false,
            mfgMultipackQty: event.mfgMultipackQty || null,
            mfgMultipackDisc: event.mfgMultipackDisc || 0,
            mfgPromoDesc: event.mfgPromoDesc || null,

            // Channel 6: Buydown
            mfgBuydownDesc: event.mfgBuydownDesc || null,
            mfgBuydownAmt: event.mfgBuydownAmt || 0,

            // Channel 7: Multipack desc + loyalty (3-case resolution)
            mfgMultipackDesc: event.mfgMultipackDesc || null,
            loyaltyId: event.loyaltyId ? hashLoyaltyId(event.loyaltyId) : null,
            loyaltyStatus: (() => {
              const hasLoyalty = !!event.loyaltyId
              const dealRequiresLoyalty = event.dealId ? dealsMap.get(event.dealId)?.requiresLoyalty : false
              if (hasLoyalty) return 'PRESENT'
              if (dealRequiresLoyalty) return 'REQUIRED_MISSING'
              return 'NONE'
            })(),
            offerCode: event.offerCode || null,

            // Derived totals
            discountApplied,
            reimbursementExpected,

            claimStatus: (() => {
              if (!claimEligible) return 'DENIED'
              // Deal requires loyalty but customer skipped → pending review
              const dealRequiresLoyalty = event.dealId ? dealsMap.get(event.dealId)?.requiresLoyalty : false
              if (dealRequiresLoyalty && !event.loyaltyId) return 'UNCLAIMED' // still claimable, but flagged
              return 'UNCLAIMED'
            })(),
          },
        })

        // Override claim eligibility for REQUIRED_MISSING loyalty
        const dealRequiresLoyalty = event.dealId ? dealsMap.get(event.dealId)?.requiresLoyalty : false
        if (dealRequiresLoyalty && !event.loyaltyId && claimEligible) {
          // Mark as needing review — still in DB, not blocked, but flagged
          await tx.tobaccoScanEvent.update({
            where: { id: scanEvent.id },
            data: {
              claimEligible: false,
              exclusionReason: 'LOYALTY_REQUIRED_MISSING',
            },
          })
          scanEvent.claimEligible = false
          scanEvent.exclusionReason = 'LOYALTY_REQUIRED_MISSING'
        }

        created.push(scanEvent)
      }

      return created
    })

    return NextResponse.json({
      success: true,
      eventsCreated: result.length,
      claimable: result.filter(e => e.claimEligible).length,
      excluded: result.filter(e => !e.claimEligible).length,
      totalDiscount: result.reduce((s, e) => s + Number(e.discountApplied), 0),
      totalReimbursement: result.filter(e => e.claimEligible)
        .reduce((s, e) => s + Number(e.reimbursementExpected), 0),
    }, { status: 201 })
  } catch (error) {
    console.error('[TOBACCO_RECORD_EVENT]', error)
    return NextResponse.json({ error: 'Failed to record scan events' }, { status: 500 })
  }
}
