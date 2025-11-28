import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        /*
        const applications = await prisma.merchantApplication.findMany({
            include: {
                franchise: {
                    select: {
                        name: true,
                        users: {
                            take: 1,
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(applications)
        */
        return NextResponse.json([])
    } catch (error) {
        console.error('Error fetching merchant applications:', error)
        return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { applicationId, status, reviewNotes } = body

        if (!applicationId || !['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        /*
        const updatedApplication = await prisma.merchantApplication.update({
            where: { id: applicationId },
            data: {
                status,
                reviewNotes,
                reviewedAt: new Date()
            }
        })

        return NextResponse.json(updatedApplication)
        */
        return NextResponse.json({ id: applicationId, status, reviewNotes })
    } catch (error) {
        console.error('Error updating merchant application:', error)
        return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }
}
