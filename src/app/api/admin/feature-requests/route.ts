import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch all feature requests (Provider only)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch all feature requests with franchisor details
        const requests = await prisma.featureRequest.findMany({
            include: {
                franchisor: {
                    select: {
                        id: true,
                        name: true,
                        owner: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { status: 'asc' }, // PENDING first
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json(requests)
    } catch (error) {
        console.error('Error fetching feature requests:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
