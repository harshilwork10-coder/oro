import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to check permissions
async function checkPermission() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return null
    }
    return session
}

// PUT: Update Franchisor Details
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params
        const body = await req.json()
        const { name, businessType, approvalStatus } = body

        const updated = await prisma.franchisor.update({
            where: { id },
            data: {
                name,
                businessType,
                approvalStatus
            },
            select: {
                id: true,
                name: true,
                businessType: true,
                approvalStatus: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating franchisor:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// DELETE: Hard Delete Franchisor
// NOTE: Soft delete (deletedAt) is not implemented in current schema
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params

        // Delete franchisor (cascade will handle related records)
        await prisma.franchisor.delete({
            where: { id }
        })

        return NextResponse.json({ success: true, message: 'Deleted successfully' })
    } catch (error) {
        console.error('Error deleting franchisor:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}

// PATCH: Update Approval Status
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params
        const body = await req.json()
        const { approvalStatus } = body

        if (!approvalStatus || !['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
            return NextResponse.json({ error: 'Invalid approval status' }, { status: 400 })
        }

        const updated = await prisma.franchisor.update({
            where: { id },
            data: { approvalStatus },
            select: {
                id: true,
                name: true,
                approvalStatus: true,
                updatedAt: true
            }
        })

        return NextResponse.json({ success: true, franchisor: updated, message: `Status updated to ${approvalStatus}` })
    } catch (error) {
        console.error('Error updating franchisor status:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
}
