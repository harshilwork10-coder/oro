import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// PATCH - Update waitlist entry status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!user?.email) {
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
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'USER',
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
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        if (!user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.waitlistEntry.delete({
            where: { id }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'USER',
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
