// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — List all department → tax group mappings for current location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId

        if (!locationId) {
            return ApiResponse.badRequest('No location associated')
        }

        const defaults = await (prisma as any).departmentTaxDefault.findMany({
            where: { locationId },
            include: {
                category: {
                    select: { id: true, name: true, departmentId: true }
                },
                taxGroup: {
                    select: { id: true, name: true, isDefault: true }
                }
            },
            orderBy: { category: { name: 'asc' } }
        })

        return ApiResponse.success({ defaults })
    } catch (error) {
        console.error('[DEPT_TAX_DEFAULTS_GET]', error)
        return ApiResponse.error('Failed to fetch department tax defaults')
    }
}

// PUT — Bulk-save department → tax group mappings
// Body: { mappings: [{ categoryId, taxGroupId }] }
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage department tax defaults')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()
        const { mappings } = body as {
            mappings: { categoryId: string; taxGroupId: string }[]
        }

        if (!mappings || !Array.isArray(mappings)) {
            return ApiResponse.badRequest('mappings array is required')
        }

        // Validate all tax groups belong to this location
        const taxGroupIds = [...new Set(mappings.map(m => m.taxGroupId))]
        const validGroups = await (prisma as any).taxGroup.findMany({
            where: { id: { in: taxGroupIds }, locationId },
            select: { id: true }
        })
        const validGroupIds = new Set(validGroups.map((g: any) => g.id))

        const invalidGroups = taxGroupIds.filter(id => !validGroupIds.has(id))
        if (invalidGroups.length > 0) {
            return ApiResponse.badRequest(`Invalid tax group IDs: ${invalidGroups.join(', ')}`)
        }

        // Upsert each mapping (delete old + create new for each category)
        const results = await prisma.$transaction(async (tx: any) => {
            const upserted = []
            for (const mapping of mappings) {
                const result = await tx.departmentTaxDefault.upsert({
                    where: {
                        locationId_categoryId: {
                            locationId,
                            categoryId: mapping.categoryId
                        }
                    },
                    update: { taxGroupId: mapping.taxGroupId },
                    create: {
                        locationId,
                        categoryId: mapping.categoryId,
                        taxGroupId: mapping.taxGroupId
                    },
                    include: {
                        category: { select: { id: true, name: true } },
                        taxGroup: { select: { id: true, name: true } }
                    }
                })
                upserted.push(result)
            }
            return upserted
        })

        return ApiResponse.success({ defaults: results, count: results.length })
    } catch (error) {
        console.error('[DEPT_TAX_DEFAULTS_PUT]', error)
        return ApiResponse.error('Failed to save department tax defaults')
    }
}

// DELETE — Remove a department → tax group mapping
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage department tax defaults')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')
        if (!categoryId) return ApiResponse.badRequest('categoryId is required')

        await (prisma as any).departmentTaxDefault.deleteMany({
            where: { locationId, categoryId }
        })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('[DEPT_TAX_DEFAULTS_DELETE]', error)
        return ApiResponse.error('Failed to delete department tax default')
    }
}
