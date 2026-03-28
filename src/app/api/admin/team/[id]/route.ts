import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// Helper to check permissions
async function checkPermission() {
    if (!user || user.role !== 'PROVIDER') {
        return null
    }
    return session
}

// PUT: Update Team Member
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params
        const body = await req.json()
        const { name, email } = body

        const updated = await prisma.user.update({
            where: { id },
            data: {
                name,
                email
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating team member:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// DELETE: Remove Team Member (Hard Delete - no deletedAt field in schema)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params

        if (id === user.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting team member:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}
