import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/auditLog'
import { prisma } from '@/lib/prisma'

/**
 * Cashier Feedback Capture
 *
 * POST — Submit feedback from any POS user
 * GET  — Owner views all feedback
 *
 * Stored in AuditLog with CASHIER_FEEDBACK prefix.
 */

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { category, message, rating, stationId } = body

        if (!message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })

        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'CASHIER_FEEDBACK',
            entityType: 'Feedback',
            entityId: category || 'GENERAL',
            details: {
                category: category || 'GENERAL', // USABILITY, BUG, SPEED, TRAINING, HARDWARE, OTHER
                message: message.trim().substring(0, 500),
                rating: typeof rating === 'number' ? Math.min(5, Math.max(1, rating)) : null, // 1-5 stars
                stationId: stationId || null,
                franchiseId: user.franchiseId,
            },
        })

        return NextResponse.json({ success: true, message: 'Thank you for your feedback' })
    } catch (error: any) {
        console.error('[CASHIER_FEEDBACK]', error)
        return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'ADMIN', 'PROVIDER', 'FRANCHISOR', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const entries = await prisma.auditLog.findMany({
            where: {
                action: 'CASHIER_FEEDBACK',
                createdAt: { gte: since },
                changes: { contains: user.franchiseId },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        })

        const feedback = entries.map(e => {
            const data = e.changes ? JSON.parse(e.changes) : {}
            return {
                id: e.id,
                category: data.category || 'GENERAL',
                message: data.message || '',
                rating: data.rating,
                stationId: data.stationId,
                submittedBy: e.userEmail,
                createdAt: e.createdAt.toISOString(),
            }
        })

        // Category breakdown
        const byCategory: Record<string, number> = {}
        for (const f of feedback) {
            byCategory[f.category] = (byCategory[f.category] || 0) + 1
        }

        const avgRating = feedback.filter(f => f.rating).length > 0
            ? Math.round(feedback.filter(f => f.rating).reduce((s, f) => s + (f.rating || 0), 0) / feedback.filter(f => f.rating).length * 10) / 10
            : null

        return NextResponse.json({
            feedback,
            summary: { total: feedback.length, byCategory, avgRating },
            period: `${days}d`,
        })
    } catch (error: any) {
        console.error('[CASHIER_FEEDBACK_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }
}
