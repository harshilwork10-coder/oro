// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Customer CRM / Intelligence API
 * 
 * GET — Customer list with RFM scores, lifetime value, segmentation
 * 
 * RFM Model:
 *   R (Recency)  — Days since last purchase (lower = better)
 *   F (Frequency) — Total purchases in period
 *   M (Monetary)  — Total spend in period
 * 
 * Segments:
 *   Champions     — High R, High F, High M (top 10%)
 *   Loyal         — Good F, Good M
 *   Potential     — Recent buyer, low frequency
 *   At-Risk       — Was loyal, hasn't bought recently
 *   Hibernating   — Haven't bought in 60+ days
 *   New           — First purchase within 14 days
 *   Lost          — Haven't bought in 90+ days
 */

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(request.url)
        const segment = searchParams.get('segment')
        const days = parseInt(searchParams.get('days') || '90')

        const since = new Date(Date.now() - days * 86400000)

        // Get all transactions with loyalty/customer data
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: { gte: since },
                loyaltyPhone: { not: null },
            },
            select: {
                id: true,
                createdAt: true,
                total: true,
                subtotal: true,
                loyaltyPhone: true,
                paymentMethod: true,
                itemLineItems: {
                    select: {
                        quantity: true,
                        priceAtSale: true,
                        item: { select: { name: true, category: true } },
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        // Group by customer (phone number)
        const customerMap: Record<string, {
            phone: string;
            transactions: typeof transactions;
            firstPurchase: Date;
            lastPurchase: Date;
            totalSpend: number;
            visitCount: number;
            avgTicket: number;
            topCategories: Record<string, number>;
            paymentMethods: Record<string, number>;
        }> = {}

        for (const tx of transactions) {
            const phone = tx.loyaltyPhone || ''
            if (!phone) continue

            if (!customerMap[phone]) {
                customerMap[phone] = {
                    phone,
                    transactions: [],
                    firstPurchase: new Date(tx.createdAt),
                    lastPurchase: new Date(tx.createdAt),
                    totalSpend: 0,
                    visitCount: 0,
                    avgTicket: 0,
                    topCategories: {},
                    paymentMethods: {},
                }
            }

            const c = customerMap[phone]
            c.transactions.push(tx)
            c.totalSpend += Number(tx.total || 0)
            c.visitCount++

            const txDate = new Date(tx.createdAt)
            if (txDate < c.firstPurchase) c.firstPurchase = txDate
            if (txDate > c.lastPurchase) c.lastPurchase = txDate

            // Track categories
            for (const li of tx.itemLineItems) {
                const cat = li.item?.category || 'Other'
                c.topCategories[cat] = (c.topCategories[cat] || 0) + (li.quantity * Number(li.priceAtSale || 0))
            }

            // Track payment methods
            const pm = tx.paymentMethod || 'CASH'
            c.paymentMethods[pm] = (c.paymentMethods[pm] || 0) + 1
        }

        // Calculate RFM scores and segment
        const now = new Date()
        const customers = Object.values(customerMap).map(c => {
            c.avgTicket = c.visitCount > 0 ? Math.round((c.totalSpend / c.visitCount) * 100) / 100 : 0

            const daysSinceLastVisit = Math.floor((now.getTime() - c.lastPurchase.getTime()) / 86400000)
            const daysSinceFirst = Math.floor((now.getTime() - c.firstPurchase.getTime()) / 86400000)

            // RFM Scoring (1-5 scale)
            const recencyScore = daysSinceLastVisit <= 7 ? 5 : daysSinceLastVisit <= 14 ? 4 : daysSinceLastVisit <= 30 ? 3 : daysSinceLastVisit <= 60 ? 2 : 1
            const frequencyScore = c.visitCount >= 20 ? 5 : c.visitCount >= 10 ? 4 : c.visitCount >= 5 ? 3 : c.visitCount >= 2 ? 2 : 1
            const monetaryScore = c.totalSpend >= 500 ? 5 : c.totalSpend >= 200 ? 4 : c.totalSpend >= 100 ? 3 : c.totalSpend >= 50 ? 2 : 1

            const rfmTotal = recencyScore + frequencyScore + monetaryScore

            // Segmentation
            let customerSegment: string
            let segmentEmoji: string

            if (daysSinceFirst <= 14 && c.visitCount <= 2) {
                customerSegment = 'New'
                segmentEmoji = '🆕'
            } else if (rfmTotal >= 13) {
                customerSegment = 'Champion'
                segmentEmoji = '🏆'
            } else if (frequencyScore >= 4 && monetaryScore >= 3) {
                customerSegment = 'Loyal'
                segmentEmoji = '💎'
            } else if (recencyScore >= 4 && frequencyScore <= 2) {
                customerSegment = 'Potential'
                segmentEmoji = '🌱'
            } else if (recencyScore <= 2 && frequencyScore >= 3) {
                customerSegment = 'At-Risk'
                segmentEmoji = '⚠️'
            } else if (daysSinceLastVisit >= 90) {
                customerSegment = 'Lost'
                segmentEmoji = '💤'
            } else if (daysSinceLastVisit >= 60) {
                customerSegment = 'Hibernating'
                segmentEmoji = '😴'
            } else {
                customerSegment = 'Regular'
                segmentEmoji = '👤'
            }

            // Top categories sorted
            const topCats = Object.entries(c.topCategories)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))

            const preferredPayment = Object.entries(c.paymentMethods)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'CASH'

            return {
                phone: c.phone,
                displayPhone: formatPhone(c.phone),
                segment: customerSegment,
                segmentEmoji,
                rfm: { recency: recencyScore, frequency: frequencyScore, monetary: monetaryScore, total: rfmTotal },
                metrics: {
                    totalSpend: Math.round(c.totalSpend * 100) / 100,
                    visitCount: c.visitCount,
                    avgTicket: c.avgTicket,
                    daysSinceLastVisit,
                    customerAge: daysSinceFirst,
                    lifetimeValue: Math.round(c.totalSpend * 100) / 100,
                },
                firstPurchase: c.firstPurchase.toISOString(),
                lastPurchase: c.lastPurchase.toISOString(),
                topCategories: topCats,
                preferredPayment,
            }
        })

        // Filter by segment if requested
        const filtered = segment
            ? customers.filter(c => c.segment.toLowerCase() === segment.toLowerCase())
            : customers

        // Sort by lifetime value
        filtered.sort((a, b) => b.metrics.lifetimeValue - a.metrics.lifetimeValue)

        // Segment summary
        const segmentCounts: Record<string, { count: number; totalSpend: number; avgTicket: number }> = {}
        for (const c of customers) {
            if (!segmentCounts[c.segment]) segmentCounts[c.segment] = { count: 0, totalSpend: 0, avgTicket: 0 }
            segmentCounts[c.segment].count++
            segmentCounts[c.segment].totalSpend += c.metrics.totalSpend
        }
        for (const seg of Object.values(segmentCounts)) {
            seg.avgTicket = seg.count > 0 ? Math.round((seg.totalSpend / seg.count) * 100) / 100 : 0
        }

        const segmentSummary = Object.entries(segmentCounts).map(([name, data]) => ({
            segment: name,
            ...data,
            totalSpend: Math.round(data.totalSpend * 100) / 100,
        })).sort((a, b) => b.totalSpend - a.totalSpend)

        // Top insights
        const totalCustomers = customers.length
        const totalRevenue = customers.reduce((s, c) => s + c.metrics.totalSpend, 0)
        const atRisk = customers.filter(c => c.segment === 'At-Risk' || c.segment === 'Hibernating')
        const champions = customers.filter(c => c.segment === 'Champion')

        const insights: { emoji: string; title: string; detail: string }[] = []

        if (champions.length > 0) {
            const champRevenue = champions.reduce((s, c) => s + c.metrics.totalSpend, 0)
            const champPct = totalRevenue > 0 ? Math.round((champRevenue / totalRevenue) * 100) : 0
            insights.push({
                emoji: '🏆',
                title: `${champions.length} Champions drive ${champPct}% of revenue`,
                detail: `These ${champions.length} customers spent $${champRevenue.toFixed(0)} total. Keep them happy with exclusive offers.`,
            })
        }

        if (atRisk.length > 0) {
            const atRiskRevenue = atRisk.reduce((s, c) => s + c.metrics.totalSpend, 0)
            insights.push({
                emoji: '⚠️',
                title: `${atRisk.length} customers at risk of leaving`,
                detail: `$${atRiskRevenue.toFixed(0)} in lifetime value at risk. Send a "We miss you" offer to bring them back.`,
            })
        }

        const avgVisits = totalCustomers > 0 ? Math.round(customers.reduce((s, c) => s + c.metrics.visitCount, 0) / totalCustomers) : 0
        insights.push({
            emoji: '📊',
            title: `${totalCustomers} tracked customers, ${avgVisits} avg visits`,
            detail: `Average lifetime value: $${totalCustomers > 0 ? (totalRevenue / totalCustomers).toFixed(0) : 0} per customer.`,
        })

        return NextResponse.json({
            period: { days, since: since.toISOString() },
            customers: filtered.slice(0, 100),
            totalCustomers,
            segmentSummary,
            insights,
            overview: {
                totalCustomers,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                avgLifetimeValue: totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0,
                avgVisits,
            },
        })

    } catch (error) {
        console.error('CRM error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
}
