/**
 * Deal Suggestions API
 * 
 * GET: Get the 3 weekly deal suggestions for a location
 * POST: Generate new suggestions (typically called by cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Discount bands by service price
const DISCOUNT_BANDS = [
    { maxPrice: 30, discount: 5, type: 'FIXED_AMOUNT' },
    { maxPrice: 60, discount: 10, type: 'FIXED_AMOUNT' },
    { maxPrice: 120, discount: 15, type: 'FIXED_AMOUNT' },
    { maxPrice: Infinity, discount: 20, type: 'FIXED_AMOUNT' }
]

function getDiscountForPrice(avgPrice: number): { value: number; type: string } {
    const band = DISCOUNT_BANDS.find(b => avgPrice <= b.maxPrice)!
    return { value: band.discount, type: band.type }
}

// GET - Get current week's suggestions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'locationId required' }, { status: 400 })
        }

        // Get current week's start
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay()) // Sunday
        weekStart.setHours(0, 0, 0, 0)

        // Find existing suggestions for this week
        let suggestions = await prisma.dealSuggestion.findMany({
            where: {
                locationId,
                weekOf: { gte: weekStart }
            },
            orderBy: { dealType: 'asc' }
        })

        // If no suggestions, generate them
        if (suggestions.length === 0) {
            suggestions = await generateSuggestions(locationId, weekStart)
        }

        return NextResponse.json({
            success: true,
            weekOf: weekStart,
            suggestions
        })

    } catch (error) {
        console.error('[DEAL_SUGGESTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
    }
}

// POST - Force regenerate suggestions (admin/cron)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { locationId } = body

        if (!locationId) {
            return NextResponse.json({ error: 'locationId required' }, { status: 400 })
        }

        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)

        // Delete old pending suggestions for this week
        await prisma.dealSuggestion.deleteMany({
            where: {
                locationId,
                weekOf: { gte: weekStart },
                status: 'PENDING'
            }
        })

        // Generate new suggestions
        const suggestions = await generateSuggestions(locationId, weekStart)

        return NextResponse.json({
            success: true,
            suggestions
        })

    } catch (error) {
        console.error('[DEAL_SUGGESTIONS_POST]', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

// Generate 3 deal suggestions based on data analysis
async function generateSuggestions(locationId: string, weekOf: Date) {
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

    // Get location data
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { franchiseId: true }
    })

    if (!location) return []

    // Analyze last 4 weeks of transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            franchiseId: location.franchiseId,
            createdAt: { gte: fourWeeksAgo },
            status: 'COMPLETED'
        },
        include: { lineItems: true }
    })

    // Find slow days (lowest transaction count)
    const dayTotals = new Map<number, number>() // 0=Sun, 1=Mon, etc.
    transactions.forEach(t => {
        const day = t.createdAt.getDay()
        dayTotals.set(day, (dayTotals.get(day) || 0) + 1)
    })

    const sortedDays = Array.from(dayTotals.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2) // Two slowest days

    const slowDays = sortedDays.map(d => ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][d[0]])

    // Calculate average service price
    const serviceTotals = transactions.flatMap(t =>
        t.lineItems.filter(li => li.type === 'SERVICE').map(li => Number(li.price))
    )
    const avgServicePrice = serviceTotals.length > 0
        ? serviceTotals.reduce((a, b) => a + b, 0) / serviceTotals.length
        : 50

    const discount = getDiscountForPrice(avgServicePrice)

    // Count inactive customers (35+ days)
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)
    const inactiveCount = await prisma.client.count({
        where: {
            franchiseId: location.franchiseId,
            lastVisit: { lt: thirtyFiveDaysAgo },
            phone: { not: null }
        }
    })

    // Create 3 suggestions
    const suggestions = await prisma.$transaction([
        // 1. Slow Day Deal
        prisma.dealSuggestion.create({
            data: {
                locationId,
                weekOf,
                dealType: 'SLOW_DAY',
                title: `Boost ${slowDays.join(' & ')}`,
                description: `Offer customers an incentive to visit on your slower days`,
                discountType: discount.type,
                discountValue: discount.value,
                priceFloor: avgServicePrice * 0.85,
                minSpend: 60,
                targetDays: slowDays,
                targetTimeStart: '10:00',
                targetTimeEnd: '14:00',
                audienceCount: 0, // Will be calculated at preview
                status: 'PENDING'
            }
        }),
        // 2. Win-Back Deal
        prisma.dealSuggestion.create({
            data: {
                locationId,
                weekOf,
                dealType: 'WIN_BACK',
                title: `Bring Back ${inactiveCount}+ Inactive Customers`,
                description: `Re-engage customers who haven't visited in 35+ days`,
                discountType: 'FIXED_AMOUNT',
                discountValue: 10,
                priceFloor: avgServicePrice * 0.90,
                targetDays: [],
                audienceCount: inactiveCount,
                status: 'PENDING'
            }
        }),
        // 3. Rebook Deal
        prisma.dealSuggestion.create({
            data: {
                locationId,
                weekOf,
                dealType: 'REBOOK',
                title: 'Increase Repeat Visits',
                description: 'Rebook within 7 days and get a discount on next visit',
                discountType: 'FIXED_AMOUNT',
                discountValue: 10,
                targetDays: [],
                audienceCount: 0,
                status: 'PENDING'
            }
        })
    ])

    return suggestions
}
