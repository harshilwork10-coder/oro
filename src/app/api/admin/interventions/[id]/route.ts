import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { status } = body
        const { id } = await params

        /*
        const intervention = await prisma.intervention.update({
            where: { id },
            data: {
                status,
                completedAt: status === 'completed' ? new Date() : null
            }
        })

        return NextResponse.json(intervention)
        */
        return NextResponse.json({ id, status, completedAt: status === 'completed' ? new Date() : null })
    } catch (error) {
        console.error('Error updating intervention:', error)
        return NextResponse.json(
            { error: 'Failed to update intervention' },
            { status: 500 }
        )
    }
}
