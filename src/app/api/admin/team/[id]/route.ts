import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to check permissions
async function checkPermission(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return null
    }
    const userRole = session.user.providerRole
    if (userRole && userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER') {
        return null
    }
    return session
}

// PUT: Update Team Member
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = params
        const body = await req.json()
        const { role, permissions } = body

        // Prevent modifying own role if not SUPER_ADMIN (or prevent locking oneself out)
        if (id === session.user.id) {
            // Optional: Allow updating own details but maybe warn about role changes
        }

        const updated = await prisma.user.update({
            where: { id },
            data: {
                providerRole: role,
                providerPermissions: JSON.stringify(permissions || {})
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating team member:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// DELETE: Remove Team Member (Soft Delete)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = params

        if (id === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting team member:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
