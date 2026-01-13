import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/owner/barber-payouts - Get today's payouts owed to each barber
 * 
 * IMPORTANT: Uses snapshot fields from line items (commissionAmount, tipAllocated).
 * Never recalculates - sums are taken directly from immutable snapshots.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = session.user.franchiseId

        // Get today's date range
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        // Get employees for this franchise
        const employees = await prisma.user.findMany({
            where: {
                franchiseId,
                role: 'EMPLOYEE'
            },
            select: {
                id: true,
                name: true
            }
        })

        // ===== USE SNAPSHOT FIELDS - NEVER RECALCULATE =====
        // Sum commissionAmount and tipAllocated from line items
        const lineItems = await prisma.transactionLineItem.findMany({
            where: {
                staffId: { in: employees.map(e => e.id) },
                transaction: {
                    franchiseId,
                    status: 'COMPLETED',
                    createdAt: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                // Only count PAID items (not voided)
                lineItemStatus: { in: ['PAID', 'REFUNDED'] }
            },
            select: {
                staffId: true,
                commissionAmount: true,
                tipAllocated: true,
                priceCharged: true,
                transaction: {
                    select: {
                        paymentMethod: true
                    }
                }
            }
        })

        // Aggregate by barber using snapshot fields
        const barberEarnings: Record<string, {
            earned: number
            commission: number
            cashTips: number
            cardTips: number
        }> = {}

        // Initialize all employees
        for (const emp of employees) {
            barberEarnings[emp.id] = {
                earned: 0,
                commission: 0,
                cashTips: 0,
                cardTips: 0
            }
        }

        // Sum snapshot fields (never recalculate)
        for (const item of lineItems) {
            if (item.staffId && barberEarnings[item.staffId]) {
                // Use priceCharged from snapshot
                barberEarnings[item.staffId].earned += Number(item.priceCharged || 0)

                // Use commissionAmount from snapshot - ALREADY CALCULATED AT CHECKOUT
                barberEarnings[item.staffId].commission += Number(item.commissionAmount || 0)

                // Use tipAllocated from snapshot
                const tipAmount = Number(item.tipAllocated || 0)
                if (item.transaction?.paymentMethod === 'CASH') {
                    barberEarnings[item.staffId].cashTips += tipAmount
                } else {
                    barberEarnings[item.staffId].cardTips += tipAmount
                }
            }
        }

        // Build response array
        const payouts = employees
            .map(emp => ({
                barberId: emp.id,
                barberName: emp.name || 'Unknown',
                earned: barberEarnings[emp.id]?.earned || 0,
                commission: barberEarnings[emp.id]?.commission || 0,
                cashTips: barberEarnings[emp.id]?.cashTips || 0,
                cardTips: barberEarnings[emp.id]?.cardTips || 0,
                totalOwed: (barberEarnings[emp.id]?.commission || 0) + (barberEarnings[emp.id]?.cardTips || 0),
                status: 'pending' as const
            }))
            .filter(p => p.earned > 0 || p.cashTips > 0 || p.cardTips > 0)

        // Calculate totals
        const totalCommissionOwed = payouts.reduce((sum, p) => sum + p.commission, 0)
        const totalCardTipsOwed = payouts.reduce((sum, p) => sum + p.cardTips, 0)
        const totalOwed = totalCommissionOwed + totalCardTipsOwed

        return NextResponse.json({
            payouts,
            totals: {
                commission: totalCommissionOwed,
                cardTips: totalCardTipsOwed,
                totalOwed
            }
        })

    } catch (error) {
        console.error('[OWNER_BARBER_PAYOUTS] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }
}
