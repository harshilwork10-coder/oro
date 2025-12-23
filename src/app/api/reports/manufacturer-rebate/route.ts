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
        const format = searchParams.get('format') || 'json'

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // Get franchise info for report header
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
            dealWhere.manufacturer = manufacturer
        }

        const deals = await prisma.tobaccoDeal.findMany({
            where: dealWhere
        })

        if (deals.length === 0) {
            return NextResponse.json({
                error: 'No deals found for this period',
                reportData: []
            })
        }

        // Get sales in the date range that might match deals
        const sales = await prisma.itemLineItem.findMany({
            where: {
                transaction: {
                    franchiseId: user.franchiseId,
                    createdAt: { gte: start, lte: end },
                    status: 'COMPLETED'
                }
            },
            include: {
                transaction: true,
                item: true
            }
        })

        // Build report data - match sales to deals by name/brand AND check deal validity dates
        const reportRows = sales.map(sale => {
            const item = sale.item
            const saleDate = sale.transaction.createdAt

            // Find matching deal by item name or brand
            const deal = deals.find(d => {
                const nameMatch = d.dealName?.toLowerCase().includes(item?.name?.toLowerCase() || '') ||
                    item?.name?.toLowerCase().includes(d.dealName?.toLowerCase() || '')

                if (!nameMatch) return false

                // CRITICAL: Check if sale date is within deal validity period
                const dealStart = new Date(d.startDate)
                const dealEnd = d.endDate ? new Date(d.endDate) : new Date('2099-12-31')

                return saleDate >= dealStart && saleDate <= dealEnd
            })

            if (!deal) return null // Skip if no valid deal or sale outside deal period

            return {
                date: saleDate.toISOString().split('T')[0],
                upc: item?.barcode || item?.sku || '',
                itemName: item?.name || 'Unknown',
                unitSize: item?.size || '',
                unitPrice: Number(item?.price || 0).toFixed(2),
                salePrice: Number(sale.unitPrice || item?.price || 0).toFixed(2),
                itemSold: sale.quantity,
                saleAmount: (Number(sale.unitPrice || item?.price || 0) * sale.quantity).toFixed(2),
                mfgDiscount: Number(deal.discountAmount).toFixed(2),
                outletDeal: deal.dealName?.match(/PLU\s*(\d+)/)?.[1] || '',
                dealValidFrom: deal.startDate.toISOString().split('T')[0],
                dealValidTo: deal.endDate?.toISOString().split('T')[0] || 'Ongoing'
            }
        }).filter(Boolean)

        // Aggregate by date + item
        const aggregated = reportRows.reduce((acc: any, row: any) => {
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
            const storeName = franchise?.name || 'Store'
            const headers = ['Date', 'UPC', 'ItemName', 'Unit Size', 'Unit Price', 'Sale Price', 'Item Sold', 'Sale Amount', 'MFG Discount', 'Outlet Deal']
            const csvRows = [
                `${storeName} Mix and Match Report`,
                `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                `${location?.address || ''} ${location?.name || ''}`,
                `Manufacturer: ${manufacturer || 'All'}`,
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

        return NextResponse.json({
            report: {
                title: `${franchise?.name || 'Store'} Mix and Match Report`,
                dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                location: location?.name || '',
                manufacturer: manufacturer || 'All'
            },
            data: finalRows,
            totals
        })

    } catch (error) {
        console.error('Error generating rebate report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
