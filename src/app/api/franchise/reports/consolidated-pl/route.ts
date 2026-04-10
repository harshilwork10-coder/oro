import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prismaReadonly as prisma } from '@/lib/prisma-readonly'

/** Consolidated P&L — Multi-location profit/loss report (Owner+ only) */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 86400000)

    try {
        const locations = await prisma.location.findMany({ where: { franchiseId: user.franchiseId }, select: { id: true, name: true } })
        const locationResults = []

        for (const location of locations) {
            const transactions = await prisma.transaction.findMany({ where: { locationId: location.id, status: 'COMPLETED', createdAt: { gte: since } }, select: { total: true, subtotal: true, taxAmount: true, paymentMethod: true } })
            const revenue = transactions.reduce((s, t) => s + Number(t.total || 0), 0)
            const netSales = transactions.reduce((s, t) => s + Number(t.subtotal || 0), 0)
            const taxCollected = transactions.reduce((s, t) => s + Number(t.taxAmount || 0), 0)

            const lineItems = await prisma.transactionLineItem.findMany({ where: { transaction: { locationId: location.id, status: 'COMPLETED', createdAt: { gte: since } } }, select: { quantity: true, unitPrice: true, item: { select: { cost: true } } } })
            const cogs = lineItems.reduce((s, li) => s + Number(li.item?.cost || 0) * (li.quantity || 1), 0)
            const grossProfit = netSales - cogs
            const cashSales = transactions.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + Number(t.total || 0), 0)
            const cardSales = transactions.filter(t => t.paymentMethod === 'CARD').reduce((s, t) => s + Number(t.total || 0), 0)

            locationResults.push({ locationId: location.id, locationName: location.name, transactionCount: transactions.length, revenue: Math.round(revenue * 100) / 100, netSales: Math.round(netSales * 100) / 100, taxCollected: Math.round(taxCollected * 100) / 100, cogs: Math.round(cogs * 100) / 100, grossProfit: Math.round(grossProfit * 100) / 100, grossMargin: netSales > 0 ? Math.round(grossProfit / netSales * 1000) / 10 : 0, cashSales: Math.round(cashSales * 100) / 100, cardSales: Math.round(cardSales * 100) / 100 })
        }

        const totals = { transactionCount: locationResults.reduce((s, r) => s + r.transactionCount, 0), revenue: Math.round(locationResults.reduce((s, r) => s + r.revenue, 0) * 100) / 100, netSales: Math.round(locationResults.reduce((s, r) => s + r.netSales, 0) * 100) / 100, taxCollected: Math.round(locationResults.reduce((s, r) => s + r.taxCollected, 0) * 100) / 100, cogs: Math.round(locationResults.reduce((s, r) => s + r.cogs, 0) * 100) / 100, grossProfit: Math.round(locationResults.reduce((s, r) => s + r.grossProfit, 0) * 100) / 100, grossMargin: 0, cashSales: Math.round(locationResults.reduce((s, r) => s + r.cashSales, 0) * 100) / 100, cardSales: Math.round(locationResults.reduce((s, r) => s + r.cardSales, 0) * 100) / 100 }
        totals.grossMargin = totals.netSales > 0 ? Math.round(totals.grossProfit / totals.netSales * 1000) / 10 : 0

        return NextResponse.json({ periodDays: days, locations: locationResults, totals })
    } catch (error: any) { console.error('[CONSOLIDATED_PL_GET]', error); return NextResponse.json({ error: 'Failed to generate P&L' }, { status: 500 }) }
}
