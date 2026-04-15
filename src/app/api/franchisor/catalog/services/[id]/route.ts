import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// PUT: Update brand service
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: serviceId } = await params

        // Verify ownership - check both role assignments AND direct ownership
        const service = await prisma.globalService.findUnique({
            where: { id: serviceId },
            include: {
                franchisor: {
                    include: {
                        roleAssignments: {
                            where: { userId: user.id }
                        }
                    }
                }
            }
        })

        // Check if user has access via role assignment OR is direct owner
        const hasRoleAssignment = service?.franchisor?.roleAssignments?.length > 0
        const isDirectOwner = service?.franchisor?.ownerId === user.id

        if (!service || (!hasRoleAssignment && !isDirectOwner)) {
            return NextResponse.json({ error: 'Not authorized to edit this service' }, { status: 403 })
        }

        const body = await req.json()
        const {
            name,
            description,
            duration,
            basePrice,
            priceMode,
            tierShortPrice,
            tierMediumPrice,
            tierLongPrice,
            categoryId,
            commissionable,
            taxTreatmentOverride,
            isAddOn,
            isActive
        } = body

        const updated = await prisma.globalService.update({
            where: { id: serviceId },
            data: {
                name,
                description,
                duration: duration !== undefined ? parseInt(duration) : undefined,
                basePrice,
                priceMode,
                tierShortPrice,
                tierMediumPrice,
                tierLongPrice,
                categoryId,
                commissionable,
                taxTreatmentOverride,
                isAddOn,
                isActive
            }
        })

        return NextResponse.json({ service: updated })

    } catch (error) {
        console.error('Error updating brand service:', error)
        return NextResponse.json({ error: 'Failed to update brand service' }, { status: 500 })
    }
}

// DELETE: Soft-delete (archive) brand service
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: serviceId } = await params

        // Verify ownership - check both role assignments AND direct ownership
        const service = await prisma.globalService.findUnique({
            where: { id: serviceId },
            include: {
                franchisor: {
                    include: {
                        roleAssignments: {
                            where: { userId: user.id }
                        }
                    }
                }
            }
        })

        // Check if user has access via role assignment OR is direct owner
        const hasRoleAssignment = service?.franchisor?.roleAssignments?.length > 0
        const isDirectOwner = service?.franchisor?.ownerId === user.id

        if (!service || (!hasRoleAssignment && !isDirectOwner)) {
            return NextResponse.json({ error: 'Not authorized to delete this service' }, { status: 403 })
        }

        // Soft delete - archive instead of hard delete
        await prisma.globalService.update({
            where: { id: serviceId },
            data: {
                isArchived: true,
                isActive: false
            }
        })

        return NextResponse.json({ message: 'Service archived' })

    } catch (error) {
        console.error('Error deleting brand service:', error)
        return NextResponse.json({ error: 'Failed to delete brand service' }, { status: 500 })
    }
}
