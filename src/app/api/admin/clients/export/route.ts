import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all clients with their data
        const clients = await prisma.franchisor.findMany({
            include: {
                owner: true,
                _count: {
                    select: { franchises: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Convert to CSV
        const headers = ['Name', 'Owner', 'Email', 'Locations', 'Joined Date', 'Status']
        const rows = clients.map(client => [
            client.name,
            client.owner.name,
            client.owner.email,
            client._count.franchises.toString(),
            new Date(client.createdAt).toLocaleDateString(),
            'Active'
        ])

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })
    } catch (error) {
        console.error('Error exporting clients:', error)
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
    }
}

