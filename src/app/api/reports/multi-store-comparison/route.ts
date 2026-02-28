/**
 * Multi-Store Comparison API
 *
 * GET — Compare performance across locations (for franchisors/owners with multiple stores)
 * Returns side-by-side revenue, transactions, avg ticket for each location.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get all locations the user has access to
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, locationId: true },
    })

    let locations: any[]
    if (['PROVIDER', 'ADMIN'].includes(user?.role || '')) {
        locations = await prisma.location.findMany({ select: { id: true, name: true, address: true } })
    } else {
        locations = user?.locationId
            ? await prisma.location.findMany({ where: { id: user.locationId }, select: { id: true, name: true, address: true } })
            : []
    }

    // Get transactions for all locations in one query
    const allTransactions = await prisma.transaction.findMany({
        where: {
            locationId: { in: locations.map(l => l.id) },
            createdAt: { gte: since },
            status: 'COMPLETED',
        },
        select: { locationId: true, total: true, createdAt: true },
    })

    // Aggregate per location
    const comparison = locations.map(loc => {
        const txns = allTransactions.filter(t => t.locationId === loc.id)
        const revenue = txns.reduce((s, t) => s + Number(t.total || 0), 0)

        return {
            locationId: loc.id,
            name: loc.name,
            address: loc.address,
            revenue: Math.round(revenue * 100) / 100,
            transactions: txns.length,
            avgTicket: txns.length > 0 ? Math.round((revenue / txns.length) * 100) / 100 : 0,
            dailyAvgRevenue: Math.round((revenue / days) * 100) / 100,
        }
    }).sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = comparison.reduce((s, l) => s + l.revenue, 0)

    return NextResponse.json({
        data: {
            period: `Last ${days} days`,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            locationCount: comparison.length,
            comparison,
        },
    })
}
