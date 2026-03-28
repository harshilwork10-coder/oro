/**
 * NPS & Reviews Report API
 *
 * GET — Net Promoter Score + review analytics from Review model
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '90')
        const since = new Date(); since.setDate(since.getDate() - days)
        const franchiseId = user.franchiseId

        const reviews = await prisma.review.findMany({
            where: { franchiseId, createdAt: { gte: since } },
            include: {
                client: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Rating distribution (1-5)
        const distribution = [0, 0, 0, 0, 0]
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++
        })

        // NPS calculation: Promoters (4-5) - Detractors (1-2)
        const promoters = reviews.filter(r => r.rating >= 4).length
        const detractors = reviews.filter(r => r.rating <= 2).length
        const nps = reviews.length > 0
            ? Math.round(((promoters - detractors) / reviews.length) * 100)
            : 0

        const avgRating = reviews.length > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : 0

        // Feedback tag breakdown
        const tags: Record<string, number> = {}
        reviews.forEach(r => {
            if (r.feedbackTag) tags[r.feedbackTag] = (tags[r.feedbackTag] || 0) + 1
        })

        return NextResponse.json({
            summary: {
                totalReviews: reviews.length,
                avgRating: Math.round(avgRating * 10) / 10,
                nps,
                promoters,
                passives: reviews.filter(r => r.rating === 3).length,
                detractors,
                googlePosted: reviews.filter(r => r.postedToGoogle).length
            },
            distribution: distribution.map((count, i) => ({
                stars: i + 1,
                count,
                pct: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
            })),
            feedbackTags: Object.entries(tags)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count),
            recentReviews: reviews.slice(0, 20).map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                feedbackTag: r.feedbackTag,
                customerName: r.client
                    ? `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim()
                    : null,
                date: r.createdAt,
                postedToGoogle: r.postedToGoogle
            })),
            periodDays: days
        })
    } catch (error) {
        console.error('[NPS_REPORT]', error)
        return NextResponse.json({ error: 'Failed to generate NPS report' }, { status: 500 })
    }
}
