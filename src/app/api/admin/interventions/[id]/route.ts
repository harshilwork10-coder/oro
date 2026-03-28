import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || (user.role !== 'PROVIDER' && user.role !== 'FRANCHISOR')) {
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
