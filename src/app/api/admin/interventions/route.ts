import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || (user.role !== 'PROVIDER' && user.role !== 'FRANCHISOR')) {
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

