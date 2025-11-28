import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const { id } = await params
        const schedule = await prisma.schedule.findUnique({
            where: { id },
            include: { location: true }
        })

        if (!schedule || schedule.location.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 })
        }

        await prisma.schedule.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting schedule:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
