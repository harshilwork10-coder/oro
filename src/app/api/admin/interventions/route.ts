import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /*
        const interventions = await prisma.intervention.findMany({
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(interventions)
        */
        return NextResponse.json([])
    } catch (error) {
        console.error('Error fetching interventions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch interventions' },
            { status: 500 }
        )
    }
}

