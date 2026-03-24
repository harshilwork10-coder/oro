import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

// PATCH - Update waitlist entry status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { status } = body

        const validStatuses = ['WAITING', 'NOTIFIED', 'SEATED', 'NO_SHOW', 'CANCELLED']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const updateData: any = { status }

        // Set timestamps based on status
        if (status === 'NOTIFIED') {
            updateData.notifiedAt = new Date()
        } else if (status === 'SEATED') {
            updateData.seatedAt = new Date()
        }

        const entry = await prisma.waitlistEntry.update({
            where: { id },
            data: updateData,
            include: {
                service: { select: { name: true } }
            }
        })

        // Audit log
        await auditLog({
            userId: session.user.id,
            userEmail: session.user.email!,
            userRole: (session.user as any).role || 'USER',
            action: 'WAITLIST_STATUS_CHANGED',
            entityType: 'WaitlistEntry',
            entityId: id,
            metadata: { status }
        })

        return NextResponse.json(entry)
    } catch (error) {
        console.error('Error updating waitlist entry:', error)
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
    }
}

// DELETE - Remove from waitlist
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.waitlistEntry.delete({
            where: { id }
        })

        // Audit log
        await auditLog({
            userId: session.user.id,
            userEmail: session.user.email!,
            userRole: (session.user as any).role || 'USER',
            action: 'WAITLIST_ENTRY_DELETED',
            entityType: 'WaitlistEntry',
            entityId: id,
            metadata: {}
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting waitlist entry:', error)
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
    }
}
