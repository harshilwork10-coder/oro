import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/manufacturer-rebate
 *
 * Generate manufacturer rebate report using TobaccoScanEvent data.
 * Supports JSON and CSV output.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const manufacturer = searchParams.get('manufacturer')
        const format = searchParams.get('format') || 'json'

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // Get franchise info
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { locations: { take: 1 } }
        })

        const location = franchise?.locations[0]

        // Query scan events (the real reimbursement truth)
        const where: any = {
            tobaccoDeal: {
                franchiseId: user.franchiseId,
            },
            soldAt: { gte: start, lte: end },
        }

        if (manufacturer) {
            where.tobaccoDeal.manufacturer = manufacturer
        }

        const scanEvents = await prisma.tobaccoScanEvent.findMany({
            where,
            include: {
                tobaccoDeal: {
                    select: {
                        dealName: true,
                        manufacturer: true,
                        type: true,
                        rewardValue: true,
                        reimbursementPerUnit: true,
                        manufacturerPLU: true,
                    },
                },
            },
            orderBy: { soldAt: 'asc' },
        })

        // Build report rows from scan events
        const reportRows = scanEvents.map(event => ({
            date: event.soldAt.toISOString().split('T')[0],
            upc: event.upc,
            dealName: event.tobaccoDeal.dealName,
            manufacturer: event.tobaccoDeal.manufacturer,
            dealType: event.tobaccoDeal.type,
            packOrCarton: event.packOrCarton,
            qty: event.qty,
            regularPrice: Number(event.regularPrice).toFixed(2),
            discountApplied: Number(event.discountApplied).toFixed(2),
            reimbursementExpected: Number(event.reimbursementExpected).toFixed(2),
            claimStatus: event.claimStatus,
            plu: event.tobaccoDeal.manufacturerPLU || '',
        }))

        // Aggregate by manufacturer
        const byManufacturer = reportRows.reduce((acc: Record<string, any>, row) => {
            if (!acc[row.manufacturer]) {
                acc[row.manufacturer] = { totalQty: 0, totalDiscount: 0, totalReimbursement: 0, events: 0 }
            }
            acc[row.manufacturer].totalQty += row.qty
            acc[row.manufacturer].totalDiscount += parseFloat(row.discountApplied) * row.qty
            acc[row.manufacturer].totalReimbursement += parseFloat(row.reimbursementExpected) * row.qty
            acc[row.manufacturer].events += 1
            return acc
        }, {})

        // Calculate totals
        const totals = {
            totalEvents: reportRows.length,
            totalItems: reportRows.reduce((sum, r) => sum + r.qty, 0),
            totalDiscount: reportRows.reduce((sum, r) => sum + parseFloat(r.discountApplied) * r.qty, 0).toFixed(2),
            totalRebate: reportRows.reduce((sum, r) => sum + parseFloat(r.reimbursementExpected) * r.qty, 0).toFixed(2),
        }

        if (format === 'csv') {
            const storeName = franchise?.name || 'Store'
            const headers = ['Date', 'UPC', 'Deal', 'Manufacturer', 'Type', 'Pack/Carton', 'Qty', 'Regular Price', 'Discount', 'Reimbursement', 'Claim Status', 'PLU']
            const csvRows = [
                `${storeName} Manufacturer Rebate Report`,
                `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                `${location?.address || ''} ${location?.name || ''}`,
                `Manufacturer: ${manufacturer || 'All'}`,
                '',
                headers.join(','),
                ...reportRows.map(r =>
                    [r.date, r.upc, `"${r.dealName}"`, r.manufacturer, r.dealType, r.packOrCarton, r.qty, r.regularPrice, r.discountApplied, r.reimbursementExpected, r.claimStatus, r.plu].join(',')
                ),
                '',
                `Total Events,${totals.totalEvents}`,
                `Total Items Sold,${totals.totalItems}`,
                `Total Customer Discount,$${totals.totalDiscount}`,
                `Total Expected Reimbursement,$${totals.totalRebate}`,
            ]

            return new NextResponse(csvRows.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="rebate-report-${startDate}-${endDate}.csv"`,
                },
            })
        }

        return NextResponse.json({
            report: {
                title: `${franchise?.name || 'Store'} Manufacturer Rebate Report`,
                dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                location: location?.name || '',
                manufacturer: manufacturer || 'All',
            },
            data: reportRows,
            byManufacturer,
            totals,
        })
    } catch (error) {
        console.error('[MANUFACTURER_REBATE_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
