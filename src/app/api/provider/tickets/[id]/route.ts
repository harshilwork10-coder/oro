import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET single ticket
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: {
                location: true,
                assignedToUser: true,
                createdByUser: true,
                franchise: true,
                messages: {
                    include: { authorUser: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
        }

        return NextResponse.json(ticket)
    } catch (error) {
        console.error('Error fetching ticket:', error)
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
    }
}

// PATCH - Update ticket (status, assignment, etc.)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { status, assignedToUserId } = body

        const updateData: any = {}

        if (status) {
            updateData.status = status
        }

        if (assignedToUserId !== undefined) {
            updateData.assignedToUserId = assignedToUserId
        }

        const ticket = await prisma.ticket.update({
            where: { id: params.id },
            data: updateData,
            include: {
                location: true,
                assignedToUser: true,
                createdByUser: true,
                franchise: true,
                messages: {
                    include: { authorUser: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        return NextResponse.json(ticket)
    } catch (error) {
        console.error('Error updating ticket:', error)
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }
}

// DELETE ticket
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        await prisma.ticket.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }
}
