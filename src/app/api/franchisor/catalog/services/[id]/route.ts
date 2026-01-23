import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

// PUT: Update brand service
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const { id: serviceId } = await params

        // Verify ownership - check both role assignments AND direct ownership
        const service = await prisma.globalService.findUnique({
            where: { id: serviceId },
            include: {
                franchisor: {
                    include: {
                        roleAssignments: {
                            where: { userId: session.user.id }
                        }
                    }
                }
            }
        })

        // Check if user has access via role assignment OR is direct owner
        const hasRoleAssignment = service?.franchisor?.roleAssignments?.length > 0
        const isDirectOwner = service?.franchisor?.ownerId === session.user.id

        if (!service || (!hasRoleAssignment && !isDirectOwner)) {
            return ApiResponse.forbidden('Not authorized to edit this service')
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

        return ApiResponse.success({ service: updated })

    } catch (error) {
        console.error('Error updating brand service:', error)
        return ApiResponse.serverError('Failed to update brand service')
    }
}

// DELETE: Soft-delete (archive) brand service
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const { id: serviceId } = await params

        // Verify ownership - check both role assignments AND direct ownership
        const service = await prisma.globalService.findUnique({
            where: { id: serviceId },
            include: {
                franchisor: {
                    include: {
                        roleAssignments: {
                            where: { userId: session.user.id }
                        }
                    }
                }
            }
        })

        // Check if user has access via role assignment OR is direct owner
        const hasRoleAssignment = service?.franchisor?.roleAssignments?.length > 0
        const isDirectOwner = service?.franchisor?.ownerId === session.user.id

        if (!service || (!hasRoleAssignment && !isDirectOwner)) {
            return ApiResponse.forbidden('Not authorized to delete this service')
        }

        // Soft delete - archive instead of hard delete
        await prisma.globalService.update({
            where: { id: serviceId },
            data: {
                isArchived: true,
                isActive: false
            }
        })

        return ApiResponse.success({ message: 'Service archived' })

    } catch (error) {
        console.error('Error deleting brand service:', error)
        return ApiResponse.serverError('Failed to delete brand service')
    }
}
