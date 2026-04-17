import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { buildLocationEODSummary } from '@/lib/reports/eodSummaryHelper'

export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { locationId: true, role: true }
    })
    
    if (!user?.locationId) return NextResponse.json({ error: 'No location context' }, { status: 400 })
    
    if (!['OWNER', 'MANAGER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
       return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tzDate = searchParams.get('tzDate') || new Date().toISOString().split('T')[0]
    
    try {
        const existingReport = await prisma.endOfDayReport.findUnique({
            where: {
                locationId_tzDate: {
                    locationId: user.locationId,
                    tzDate
                }
            }
        })
        
        if (existingReport) {
            return NextResponse.json({
                alreadyClosed: true,
                report: existingReport
            })
        }
        
        const summary = await buildLocationEODSummary(user.locationId, tzDate)
        
        return NextResponse.json({
            alreadyClosed: false,
            summary
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { locationId: true, role: true }
    })
    
    if (!user?.locationId) return NextResponse.json({ error: 'No location context' }, { status: 400 })
    
    if (!['OWNER', 'MANAGER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
       return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const body = await req.json()
    const { tzDate, actualCash, varianceNote } = body
    
    if (!tzDate) return NextResponse.json({ error: 'tzDate required' }, { status: 400 })

    try {
        // Idempotency: Location + tzDate is blocked from double insert by Schema @@unique
        const existing = await prisma.endOfDayReport.findUnique({
            where: { locationId_tzDate: { locationId: user.locationId, tzDate } }
        })
        
        if (existing) {
            return NextResponse.json({ error: 'End of Day is already closed for this date.' }, { status: 400 })
        }
        
        // Final authoritative fetch within exact local timezone bounds
        const summary = await buildLocationEODSummary(user.locationId, tzDate)
        
        if (!summary.canClose) {
            return NextResponse.json({ error: 'Cannot close day. There are outstanding open shifts.', openShifts: summary.openShifts }, { status: 400 })
        }
        
        const variance = Number(actualCash) - summary.data.expectedCash
        
        // Require override note if variance > $5
        if (Math.abs(variance) > 5 && !varianceNote) {
            return NextResponse.json({ error: 'A variance over $5 requires a manager explanation note.' }, { status: 400 })
        }
        
        // If variance note exists, the manager is overriding it
        const isVarianceApproved = Math.abs(variance) > 5
        
        // Craft exact data to persist
        const payloadData = {
            tzDate,
            locationId: user.locationId,
            closingManagerId: authUser.id,
            closedByRole: user.role,
            
            grossSales: summary.data.grossSales,
            netSales: summary.data.netSales,
            
            cashSales: summary.data.cashSales,
            cardSales: summary.data.cardSales,
            splitCash: summary.data.splitCash,
            splitCard: summary.data.splitCard,
            
            tax: summary.data.tax,
            tips: summary.data.tips,
            cashRefunds: summary.data.cashRefunds,
            refunds: summary.data.refunds,
            voids: summary.data.voids,
            discounts: summary.data.discounts,
            
            noSaleCount: summary.data.noSaleCount,
            paidInTotal: summary.data.paidInTotal,
            paidOutTotal: summary.data.paidOutTotal,
            cashDropsTotal: summary.data.cashDropsTotal,
            
            openingCashTotal: summary.data.openingCashTotal,
            expectedCash: summary.data.expectedCash,
            actualCash: Number(actualCash),
            variance: variance,
            
            varianceNote: varianceNote || null,
            isVarianceApproved,
            
            transactionCount: summary.data.transactionCount,
            shiftBreakdown: summary.data.shiftBreakdown as any
        }
        
        // 100% Immutable representation for later printing.
        const reportPayload = {
            ...payloadData,
            storeTimezone: summary.timezone,
            bounds: summary.bounds,
            generatedAt: new Date().toISOString()
        }
        
        const eodRecord = await prisma.$transaction(async (tx) => {
            const row = await tx.endOfDayReport.create({
                data: {
                    ...payloadData,
                    reportPayload: reportPayload as any
                }
            })
            
            // Create final drawer activity
            await tx.drawerActivity.create({
                data: {
                    type: 'END_OF_DAY',
                    amount: Number(actualCash),
                    note: `Store EOD: Counted $${Number(actualCash).toFixed(2)}. Var: $${variance.toFixed(2)}${varianceNote ? ` - ${varianceNote}` : ''}`,
                    employeeId: authUser.id,
                    // Note: No shiftId attached because this is a Store-level activity
                }
            })
            
            return row
        })
        
        return NextResponse.json({ success: true, report: eodRecord })

    } catch (err: any) {
        console.error('Failed POST eod:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
