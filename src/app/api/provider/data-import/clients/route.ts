import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all franchises for the client picker dropdown
// Returns minimal data: franchise id, name, owner, business type, item count
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const search = request.nextUrl.searchParams.get('search') || ''

        const franchisors = await prisma.franchisor.findMany({
            where: search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { owner: { name: { contains: search, mode: 'insensitive' } } },
                    { owner: { email: { contains: search, mode: 'insensitive' } } },
                ]
            } : undefined,
            select: {
                id: true,
                name: true,
                businessType: true,
                accountStatus: true,
                owner: {
                    select: { name: true, email: true }
                },
                franchises: {
                    select: {
                        id: true,
                        name: true,
                        _count: {
                            select: {
                                clients: true,
                                departments: true,
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' },
            take: 50,
        })

        // Get item counts via separate query (Item model)
        const franchiseIds = franchisors.flatMap(f => f.franchises.map(fr => fr.id))
        const itemCounts = franchiseIds.length > 0
            ? await prisma.item.groupBy({
                by: ['franchiseId'],
                where: { franchiseId: { in: franchiseIds } },
                _count: true,
            })
            : []
        const itemCountMap = new Map(itemCounts.map(ic => [ic.franchiseId, ic._count]))

        const result = franchisors.map(f => ({
            id: f.id,
            name: f.name || 'Unnamed Business',
            businessType: f.businessType,
            accountStatus: f.accountStatus,
            ownerName: f.owner?.name || 'Unknown',
            ownerEmail: f.owner?.email || '',
            franchises: f.franchises.map(fr => ({
                id: fr.id,
                name: fr.name,
                itemCount: itemCountMap.get(fr.id) || 0,
                clientCount: fr._count.clients,
                departmentCount: fr._count.departments,
            })),
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching clients for import:', error)
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }
}
