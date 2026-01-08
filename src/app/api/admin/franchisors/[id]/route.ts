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
// NOTE: Must delete related records in correct order due to foreign key constraints
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const { id } = await params

        // Find the franchisor first
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            include: {
                franchises: {
                    include: {
                        locations: true
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get all franchise IDs and location IDs
        const franchiseIds = franchisor.franchises.map(f => f.id)
        const locationIds = franchisor.franchises.flatMap(f => f.locations.map(l => l.id))

        // Delete in correct order (most dependent first)
        // 1. Delete products
        if (franchiseIds.length > 0) {
            await prisma.product.deleteMany({ where: { franchiseId: { in: franchiseIds } } })
            await prisma.productCategory.deleteMany({ where: { franchiseId: { in: franchiseIds } } })
        }

        // 2. Delete stations and terminals
        if (locationIds.length > 0) {
            await prisma.station.deleteMany({ where: { locationId: { in: locationIds } } })
            await prisma.paymentTerminal.deleteMany({ where: { locationId: { in: locationIds } } })
        }

        // 3. Delete employees (users tied to franchise)
        if (franchiseIds.length > 0) {
            await prisma.user.deleteMany({
                where: {
                    franchiseId: { in: franchiseIds },
                    role: 'EMPLOYEE'
                }
            })
        }

        // 4. Delete locations
        if (locationIds.length > 0) {
            await prisma.location.deleteMany({ where: { id: { in: locationIds } } })
        }

        // 5. Delete franchises
        if (franchiseIds.length > 0) {
            await prisma.franchise.deleteMany({ where: { id: { in: franchiseIds } } })
        }

        // 6. Delete magic links for the owner
        await prisma.magicLink.deleteMany({ where: { userId: franchisor.ownerId } })

        // 7. Delete the franchisor (this should now work)
        await prisma.franchisor.delete({ where: { id } })

        // 8. Delete the owner user
        await prisma.user.delete({ where: { id: franchisor.ownerId } })

        return NextResponse.json({ success: true, message: 'Deleted successfully' })
    } catch (error) {
        console.error('Error deleting franchisor:', error)
        return NextResponse.json({ error: 'Failed to delete client. Check server logs for details.' }, { status: 500 })
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
