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

        // Fetch orders that are approved and have contract signed
        const orders = await prisma.licenseRequest.findMany({
            where: {
                status: 'APPROVED',
                contractSignedAt: { not: null }
            },
            include: {
                franchisor: {
                    select: {
                        name: true,
                        owner: {
                            select: { name: true, email: true }
                        }
                    }
                },
                location: {
                    select: { name: true, address: true }
                }
            },
            orderBy: { contractSignedAt: 'desc' }
        })

        return NextResponse.json({ orders })

    } catch (error) {
        console.error('Error fetching pending shipments:', error)
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        )
    }
}
