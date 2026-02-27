'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — List tax groups for current user's location, with components expanded
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId

        if (!locationId) {
            return ApiResponse.badRequest('No location associated')
        }

        const taxGroups = await (prisma as any).taxGroup.findMany({
            where: { locationId },
            include: {
                components: {
                    include: {
                        jurisdiction: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                salesTaxRate: true,
                                effectiveFrom: true,
                                isActive: true,
                                priority: true
                            }
                        }
                    },
                    orderBy: { compoundOrder: 'asc' }
                },
                _count: { select: { departmentDefaults: true } }
            },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })

        return ApiResponse.success({ taxGroups })
    } catch (error) {
        console.error('[TAX_GROUPS_GET]', error)
        return ApiResponse.error('Failed to fetch tax groups')
    }
}

// POST — Create a tax group with components
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage tax groups')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()
        const { name, isDefault, componentIds } = body as {
            name: string
            isDefault?: boolean
            componentIds?: { jurisdictionId: string; compoundOrder?: number }[]
        }

        if (!name?.trim()) {
            return ApiResponse.badRequest('Tax group name is required')
        }

        // If setting as default, unset any existing default first
        if (isDefault) {
            await (prisma as any).taxGroup.updateMany({
                where: { locationId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const taxGroup = await (prisma as any).taxGroup.create({
            data: {
                locationId,
                name: name.trim().toUpperCase(),
                isDefault: isDefault || false,
                components: componentIds?.length ? {
                    create: componentIds.map(c => ({
                        jurisdictionId: c.jurisdictionId,
                        compoundOrder: c.compoundOrder || 0
                    }))
                } : undefined
            },
            include: {
                components: {
                    include: { jurisdiction: true },
                    orderBy: { compoundOrder: 'asc' }
                }
            }
        })

        return ApiResponse.success({ taxGroup })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return ApiResponse.badRequest('A tax group with that name already exists at this location')
        }
        console.error('[TAX_GROUPS_POST]', error)
        return ApiResponse.error('Failed to create tax group')
    }
}

// PUT — Update a tax group (rename, change default, replace components)
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage tax groups')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()
        const { id, name, isDefault, componentIds } = body as {
            id: string
            name?: string
            isDefault?: boolean
            componentIds?: { jurisdictionId: string; compoundOrder?: number }[]
        }

        if (!id) return ApiResponse.badRequest('Tax group ID is required')

        // Verify ownership
        const existing = await (prisma as any).taxGroup.findFirst({
            where: { id, locationId }
        })
        if (!existing) return ApiResponse.notFound('Tax group not found')

        // If setting as default, unset others
        if (isDefault) {
            await (prisma as any).taxGroup.updateMany({
                where: { locationId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            })
        }

        // Replace components if provided
        if (componentIds !== undefined) {
            await (prisma as any).taxGroupComponent.deleteMany({
                where: { taxGroupId: id }
            })
            if (componentIds.length > 0) {
                await (prisma as any).taxGroupComponent.createMany({
                    data: componentIds.map(c => ({
                        taxGroupId: id,
                        jurisdictionId: c.jurisdictionId,
                        compoundOrder: c.compoundOrder || 0
                    }))
                })
            }
        }

        const taxGroup = await (prisma as any).taxGroup.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim().toUpperCase() } : {}),
                ...(isDefault !== undefined ? { isDefault } : {})
            },
            include: {
                components: {
                    include: { jurisdiction: true },
                    orderBy: { compoundOrder: 'asc' }
                }
            }
        })

        return ApiResponse.success({ taxGroup })
    } catch (error) {
        console.error('[TAX_GROUPS_PUT]', error)
        return ApiResponse.error('Failed to update tax group')
    }
}

// DELETE — Delete a tax group
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage tax groups')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return ApiResponse.badRequest('Tax group ID is required')

        // Verify ownership
        const existing = await (prisma as any).taxGroup.findFirst({
            where: { id, locationId }
        })
        if (!existing) return ApiResponse.notFound('Tax group not found')

        await (prisma as any).taxGroup.delete({ where: { id } })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('[TAX_GROUPS_DELETE]', error)
        return ApiResponse.error('Failed to delete tax group')
    }
}
