import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const requests = await prisma.licenseRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                franchisor: {
                    select: { name: true, owner: { select: { name: true, email: true } } }
                },
                location: {
                    select: { name: true, address: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ requests })

    } catch (error) {
        console.error('Error fetching requests:', error)
        return NextResponse.json(
            { error: 'Failed to fetch requests' },
            { status: 500 }
        )
    }
}
