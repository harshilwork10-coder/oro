import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor ID
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Fetch stats
        const totalLeads = await prisma.lead.count({
            where: { franchisorId: franchisor.id }
        })

        const pipelineValue = await prisma.lead.aggregate({
            where: { franchisorId: franchisor.id },
            _sum: { estimatedValue: true }
        })

        const activeTerritories = await prisma.territory.count({
            where: { franchisorId: franchisor.id, isAvailable: false }
        })

        // Calculate conversion rate (Closed Won / Total Leads)
        const closedWon = await prisma.lead.count({
            where: { franchisorId: franchisor.id, status: 'CLOSED_WON' }
        })
        const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0

        // Recent leads
        const recentLeads = await prisma.lead.findMany({
            where: { franchisorId: franchisor.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        })

        return NextResponse.json({
            totalLeads,
            pipelineValue: pipelineValue._sum.estimatedValue || 0,
            conversionRate: parseFloat(conversionRate.toFixed(1)),
            activeTerritories,
            recentLeads
        })
    } catch (error) {
        console.error('Error fetching CRM stats:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
