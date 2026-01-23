import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all franchises (for Provider to filter audit logs by store)
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'PROVIDER only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '500')

    try {
        const where: any = {}

        // Search by name only (city/state in settings)
        if (search) {
            where.name = { contains: search }
        }

        const franchises = await prisma.franchise.findMany({
            where,
            select: {
                id: true,
                name: true,
                franchisorId: true,
                approvalStatus: true,
                createdAt: true,
                settings: {
                    select: {
                        storeCity: true,
                        storeState: true
                    }
                }
            },
            orderBy: { name: 'asc' },
            take: limit
        })

        // Flatten the response
        const result = franchises.map(f => ({
            id: f.id,
            name: f.name,
            city: f.settings?.storeCity || '',
            state: f.settings?.storeState || '',
            status: f.approvalStatus,
            franchisorId: f.franchisorId
        }))

        return NextResponse.json({ franchises: result })
    } catch (error) {
        console.error('[ADMIN_FRANCHISES_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }
}
