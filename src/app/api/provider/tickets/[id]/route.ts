import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET single ticket
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id },
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
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    if (!user || user.role !== 'PROVIDER') {
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
            where: { id },
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
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        await prisma.ticket.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
    }
}
