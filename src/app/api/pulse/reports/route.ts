import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({
                paymentBreakdown: { cash: 0, card: 0, other: 0 },
                voidedTransactions: [],
                employeeSales: [],
                drawerVariance: []
            })
        }

        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        const locationFilter = locationId && locationId !== 'all'
            ? { locationId }
            : { franchiseId: user.franchiseId }

        // Get today's transactions for payment breakdown
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: today },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            select: {
                id: true,
                total: true,
                tax: true,
                paymentMethod: true,
                employee: { select: { id: true, name: true } }
            }
        })

        // Payment breakdown
        let cash = 0, card = 0, other = 0
        todayTransactions.forEach(tx => {
            const amount = Number(tx.total)
            const method = (tx.paymentMethod || '').toUpperCase()
            if (method.includes('CASH')) {
                cash += amount
            } else if (method.includes('CARD') || method.includes('CREDIT') || method.includes('DEBIT')) {
                card += amount
            } else {
                other += amount
            }
        })

        // Employee sales ranking
        const employeeSalesMap: Record<string, { name: string, sales: number, transactions: number }> = {}
        todayTransactions.forEach(tx => {
            if (tx.employee) {
                const id = tx.employee.id
                if (!employeeSalesMap[id]) {
                    employeeSalesMap[id] = { name: tx.employee.name || 'Unknown', sales: 0, transactions: 0 }
                }
                employeeSalesMap[id].sales += Number(tx.total)
                employeeSalesMap[id].transactions += 1
            }
        })
        const employeeSales = Object.values(employeeSalesMap)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)

        // Voided/refunded transactions
        const voidedTransactions = await prisma.transaction.findMany({
            where: {
                ...locationFilter,
                createdAt: { gte: today },
                status: { in: ['VOIDED', 'REFUNDED', 'CANCELLED'] }
            },
            select: {
                id: true,
                total: true,
                status: true,
                createdAt: true,
                employeeId: true,
                voidReason: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })

        // Currently OPEN cash drawers - model may not exist yet
        // TODO: Add CashDrawer model to schema when ready
        const openDrawers: Array<{ id: string; currentCash: number; location: string; openedBy: string }> = []

        // Calculate separate counts
        const voidCount = voidedTransactions.filter(t => t.status === 'VOIDED' || t.status === 'CANCELLED').length
        const refundCount = voidedTransactions.filter(t => t.status === 'REFUNDED').length

        // Calculate total sales and tax collected
        let totalSales = 0
        let taxCollected = 0
        todayTransactions.forEach(tx => {
            totalSales += Number(tx.total)
            taxCollected += Number(tx.tax || 0)
        })

        return NextResponse.json({
            paymentBreakdown: { cash, card, other },
            totalSales,
            taxCollected,
            employeeSales,
            voidCount,
            refundCount,
            voidedTransactions: voidedTransactions.map(t => ({
                id: t.id,
                amount: Number(t.total),
                status: t.status,
                reason: t.voidReason || '',
                employeeId: t.employeeId || 'Unknown',
                time: t.createdAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || ''
            })),
            openDrawers
        })

    } catch (error) {
        console.error('Pulse reports error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
