import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get AI-powered daily sales insights for Owner dashboard
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Owner access only' }, { status: 403 })
        }

        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ insights: [], message: 'No franchise configured' })
        }

        // Get today's date boundaries
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Last week same day for comparison
        const lastWeekSameDay = new Date(today)
        lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7)
        const lastWeekNextDay = new Date(lastWeekSameDay)
        lastWeekNextDay.setDate(lastWeekNextDay.getDate() + 1)

        // Get today's transactions
        const todayTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: { gte: today, lt: tomorrow },
                status: 'COMPLETED'
            }
        })

        // Get last week same day transactions for comparison
        const lastWeekTransactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                createdAt: { gte: lastWeekSameDay, lt: lastWeekNextDay },
                status: 'COMPLETED'
            }
        })

        // Calculate totals (convert Decimal to number)
        const todayTotal = todayTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)
        const todayCount = todayTransactions.length
        const lastWeekTotal = lastWeekTransactions.reduce((sum, t) => sum + Number(t.total || 0), 0)

        // Generate insights
        const insights: { type: string; icon: string; message: string; value?: string }[] = []

        // Week comparison insight
        if (lastWeekTotal > 0) {
            const percentChange = ((todayTotal - lastWeekTotal) / lastWeekTotal * 100)
            const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
            if (percentChange > 5) {
                insights.push({
                    type: 'trend_up',
                    icon: '📈',
                    message: `Sales ${percentChange.toFixed(0)}% higher than last ${dayName}`,
                    value: `$${todayTotal.toFixed(2)} vs $${lastWeekTotal.toFixed(2)}`
                })
            } else if (percentChange < -5) {
                insights.push({
                    type: 'trend_down',
                    icon: '📉',
                    message: `Sales ${Math.abs(percentChange).toFixed(0)}% lower than last ${dayName}`,
                    value: `$${todayTotal.toFixed(2)} vs $${lastWeekTotal.toFixed(2)}`
                })
            } else {
                insights.push({
                    type: 'trend_same',
                    icon: '➡️',
                    message: `Sales steady vs last ${dayName}`,
                    value: `$${todayTotal.toFixed(2)}`
                })
            }
        } else if (todayTotal > 0) {
            insights.push({
                type: 'new_record',
                icon: '🎉',
                message: 'First sales on this day of week!',
                value: `$${todayTotal.toFixed(2)}`
            })
        }

        // Transaction count insight
        if (todayCount > 0) {
            const avgTicket = todayTotal / todayCount
            insights.push({
                type: 'avg_ticket',
                icon: '🧾',
                message: `${todayCount} transactions today`,
                value: `Avg: $${avgTicket.toFixed(2)}`
            })
        }

        // Slow day / closed insight
        if (todayCount === 0) {
            const hour = new Date().getHours()
            if (hour >= 10 && hour < 20) {
                insights.push({
                    type: 'no_sales',
                    icon: '☕',
                    message: 'No sales yet today',
                    value: 'Time for a coffee?'
                })
            } else {
                insights.push({
                    type: 'closed',
                    icon: '🌙',
                    message: 'Store currently closed',
                    value: 'Have a great evening!'
                })
            }
        }

        return NextResponse.json({
            insights,
            summary: {
                todayTotal,
                todayCount,
                lastWeekTotal
            }
        })

    } catch (error) {
        console.error('Error generating insights:', error)
        return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
    }
}
