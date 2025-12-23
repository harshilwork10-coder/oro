import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Generate manufacturer rebate report
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const manufacturer = searchParams.get('manufacturer')
        const dealPlu = searchParams.get('dealPlu')
        const format = searchParams.get('format') || 'json' // json or csv

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // Get location info for report header
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { locations: { take: 1 } }
        })

        const location = franchise?.locations[0]

        // Get active deals for this period
        const dealWhere: any = {
            franchiseId: user.franchiseId,
            isActive: true,
            startDate: { lte: end },
            OR: [
                { endDate: { gte: start } },
                { endDate: null }
            ]
        }

        if (manufacturer) {
            dealWhere.manufacturerName = manufacturer
        }
        if (dealPlu) {
            dealWhere.manufacturerPLU = dealPlu
        }

        const deals = await prisma.tobaccoDeal.findMany({
            where: dealWhere,
            include: {
                item: true
            }
        })

        if (deals.length === 0) {
            return NextResponse.json({
                error: 'No deals found for this period',
                reportData: []
            })
        }

        // Get sales of items with deals in the date range
        const itemIds = deals.map(d => d.itemId).filter(Boolean) as string[]

        const sales = await prisma.itemLineItem.findMany({
            where: {
                transaction: {
                    franchiseId: user.franchiseId,
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED'
                },
                itemId: { in: itemIds }
            },
            include: {
                transaction: true,
                item: true
            }
        })

        // Build report data matching Pridom format
        const reportRows = sales.map(sale => {
            const deal = deals.find(d => d.itemId === sale.itemId)
            const item = sale.item

            return {
                date: sale.transaction.createdAt.toISOString().split('T')[0],
                upc: item?.barcode || '',
                itemName: item?.name || 'Unknown',
                unitSize: item?.size || '',
                unitPrice: Number(sale.unitPrice || item?.price || 0).toFixed(2),
                salePrice: Number(sale.totalPrice || 0).toFixed(2),
                itemSold: sale.quantity,
                saleAmount: (Number(sale.totalPrice || 0) * sale.quantity).toFixed(2),
                mfgDiscount: deal ? Number(deal.discountAmount).toFixed(2) : '0.00',
                outletDeal: deal?.manufacturerPLU || ''
            }
        })

        // Aggregate by date + item
        const aggregated = reportRows.reduce((acc: any, row) => {
            const key = `${row.date}_${row.upc}`
            if (!acc[key]) {
                acc[key] = { ...row }
            } else {
                acc[key].itemSold += row.itemSold
                acc[key].saleAmount = (parseFloat(acc[key].saleAmount) + parseFloat(row.saleAmount)).toFixed(2)
            }
            return acc
        }, {})

        const finalRows = Object.values(aggregated)

        // Calculate totals
        const totals = {
            totalItems: finalRows.reduce((sum: number, r: any) => sum + r.itemSold, 0),
            totalSales: finalRows.reduce((sum: number, r: any) => sum + parseFloat(r.saleAmount), 0).toFixed(2),
            totalRebate: finalRows.reduce((sum: number, r: any) => sum + (parseFloat(r.mfgDiscount) * r.itemSold), 0).toFixed(2)
        }

        if (format === 'csv') {
            // Generate CSV
            const headers = ['Date', 'UPC', 'ItemName', 'Unit Size', 'Unit Price', 'Sale Price', 'Item Sold', 'Sale Amount', 'MFG Discount', 'Outlet Deal']
            const csvRows = [
                // Header info
                `Pridom Mix and Match Report`,
                `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                `${location?.address || ''}, ${location?.city || ''} ${location?.state || ''} ${location?.zip || ''}`,
                `MFG Deal: ${dealPlu || 'All'}`,
                '',
                headers.join(','),
                ...finalRows.map((r: any) =>
                    [r.date, r.upc, `"${r.itemName}"`, r.unitSize, r.unitPrice, r.salePrice, r.itemSold, r.saleAmount, r.mfgDiscount, r.outletDeal].join(',')
                ),
                '',
                `Total Items Sold,${totals.totalItems}`,
                `Total Sales,$${totals.totalSales}`,
                `Total Rebate,$${totals.totalRebate}`
            ]

            return new NextResponse(csvRows.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="rebate-report-${startDate}-${endDate}.csv"`
                }
            })
        }

        // Return JSON
        return NextResponse.json({
            report: {
                title: 'Pridom Mix and Match Report',
                dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                location: location ? `${location.address}, ${location.city} ${location.state} ${location.zip}` : '',
                mfgDeal: dealPlu || 'All'
            },
            data: finalRows,
            totals
        })

    } catch (error) {
        console.error('Error generating rebate report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
