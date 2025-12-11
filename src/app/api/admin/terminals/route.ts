import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const terminals = await prisma.terminal.findMany({
            select: {
                id: true,
                serialNumber: true,
                model: true,
                status: true,
                locationId: true,
                ipAddress: true,
                macAddress: true,
                createdAt: true,
                updatedAt: true,
                location: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ terminals })
    } catch (error) {
        console.error('Fetch terminals error:', error)
        return NextResponse.json({ error: 'Failed to fetch terminals' }, { status: 500 })
    }
}
