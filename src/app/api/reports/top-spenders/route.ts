import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '20')

        let franchiseId = user?.franchiseId

        if (user?.role === 'FRANCHISOR' && !franchiseId) {
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                include: { franchises: { take: 1, select: { id: true } } }
            })
            if (franchisor?.franchises[0]) {
                franchiseId = franchisor.franchises[0].id
            }
        }

        if (!franchiseId) {
            return NextResponse.json({ customers: [] })
        }

        // Group transactions by client
        const clientSpending = await prisma.transaction.groupBy({
            by: ['clientId'],
            where: {
                franchiseId: franchiseId,
                clientId: { not: null },
                status: { in: ['COMPLETED', 'APPROVED'] }
            },
            _count: { id: true },
            _sum: { total: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limit
        })

        // Get client details
        const clientIds = clientSpending.filter(c => c.clientId).map(c => c.clientId as string)
        const clients = await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true, phone: true }
        })

        const clientMap = new Map(clients.map(c => [c.id, c]))

        const customers = clientSpending.map((spending, index) => {
            const client = clientMap.get(spending.clientId || '')
            const totalSpent = Number(spending._sum?.total || 0)
            const visitCount = spending._count?.id || 0
            return {
                id: spending.clientId || '',
                name: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
                phone: client?.phone || '',
                totalSpent,
                visitCount,
                averageTicket: visitCount > 0 ? totalSpent / visitCount : 0,
                rank: index + 1
            }
        })

        return NextResponse.json({ customers })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

