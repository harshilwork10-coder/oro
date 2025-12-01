import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// Helper to check permissions
async function checkPermission(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return null
    }
    return session
}

// PUT: Update Franchisor Details
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = params
        const body = await req.json()
        const { name, supportFee, type } = body

        const updated = await prisma.franchisor.update({
            where: { id },
            data: {
                name,
                supportFee: supportFee ? new Decimal(supportFee) : undefined,
                type
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating franchisor:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// DELETE: Soft Delete (Archive)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = params
        const now = new Date()

        // Transaction to soft delete everything related
        await prisma.$transaction(async (tx) => {
            // 1. Archive Franchisor
            const franchisor = await tx.franchisor.update({
                where: { id },
                data: { deletedAt: now }
            })

            // 2. Archive Owner User
            if (franchisor.ownerId) {
                await tx.user.update({
                    where: { id: franchisor.ownerId },
                    data: { deletedAt: now }
                })
            }

            // 3. Archive all Franchises
            await tx.franchise.updateMany({
                where: { franchisorId: id },
                data: { deletedAt: now }
            })

            // 4. Archive all Users in those Franchises (Employees)
            // First find all franchises to get IDs
            const franchises = await tx.franchise.findMany({
                where: { franchisorId: id },
                select: { id: true }
            })
            const franchiseIds = franchises.map(f => f.id)

            if (franchiseIds.length > 0) {
                await tx.user.updateMany({
                    where: { franchiseId: { in: franchiseIds } },
                    data: { deletedAt: now }
                })
            }
        })

        return NextResponse.json({ success: true, message: 'Archived successfully' })
    } catch (error) {
        console.error('Error archiving franchisor:', error)
        return NextResponse.json({ error: 'Failed to archive' }, { status: 500 })
    }
}

// PATCH: Restore (Un-archive)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = params

        // Transaction to restore everything
        await prisma.$transaction(async (tx) => {
            // 1. Restore Franchisor
            const franchisor = await tx.franchisor.update({
                where: { id },
                data: { deletedAt: null }
            })

            // 2. Restore Owner User
            if (franchisor.ownerId) {
                await tx.user.update({
                    where: { id: franchisor.ownerId },
                    data: { deletedAt: null }
                })
            }

            // 3. Restore all Franchises
            await tx.franchise.updateMany({
                where: { franchisorId: id },
                data: { deletedAt: null }
            })

            // 4. Restore all Users in those Franchises
            const franchises = await tx.franchise.findMany({
                where: { franchisorId: id },
                select: { id: true }
            })
            const franchiseIds = franchises.map(f => f.id)

            if (franchiseIds.length > 0) {
                await tx.user.updateMany({
                    where: { franchiseId: { in: franchiseIds } },
                    data: { deletedAt: null }
                })
            }
        })

        return NextResponse.json({ success: true, message: 'Restored successfully' })
    } catch (error) {
        console.error('Error restoring franchisor:', error)
        return NextResponse.json({ error: 'Failed to restore' }, { status: 500 })
    }
}
