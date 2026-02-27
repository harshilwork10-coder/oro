'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — List all category → pricing rule mappings for current location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const mappings = await (prisma as any).categoryPricingRule.findMany({
            where: { locationId },
            include: {
                category: { select: { id: true, name: true } },
                pricingRule: { select: { id: true, name: true, label: true, method: true } }
            },
            orderBy: { category: { name: 'asc' } }
        })

        return ApiResponse.success({ mappings })
    } catch (error) {
        console.error('[CAT_PRICING_RULES_GET]', error)
        return ApiResponse.error('Failed to fetch category pricing rules')
    }
}

// PUT — Bulk-save category → pricing rule mappings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage category pricing rules')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()
        const { mappings } = body as {
            mappings: { categoryId: string; pricingRuleId: string }[]
        }

        if (!mappings || !Array.isArray(mappings)) {
            return ApiResponse.badRequest('mappings array is required')
        }

        // Validate rules belong to this location
        const ruleIds = [...new Set(mappings.map(m => m.pricingRuleId))]
        const validRules = await (prisma as any).pricingRule.findMany({
            where: { id: { in: ruleIds }, locationId },
            select: { id: true }
        })
        const validRuleIds = new Set(validRules.map((r: any) => r.id))
        const invalidRules = ruleIds.filter(id => !validRuleIds.has(id))
        if (invalidRules.length > 0) {
            return ApiResponse.badRequest(`Invalid pricing rule IDs: ${invalidRules.join(', ')}`)
        }

        const results = await prisma.$transaction(async (tx: any) => {
            const upserted = []
            for (const mapping of mappings) {
                const result = await tx.categoryPricingRule.upsert({
                    where: {
                        locationId_categoryId: {
                            locationId,
                            categoryId: mapping.categoryId
                        }
                    },
                    update: { pricingRuleId: mapping.pricingRuleId },
                    create: {
                        locationId,
                        categoryId: mapping.categoryId,
                        pricingRuleId: mapping.pricingRuleId
                    },
                    include: {
                        category: { select: { id: true, name: true } },
                        pricingRule: { select: { id: true, name: true, label: true } }
                    }
                })
                upserted.push(result)
            }
            return upserted
        })

        return ApiResponse.success({ mappings: results, count: results.length })
    } catch (error) {
        console.error('[CAT_PRICING_RULES_PUT]', error)
        return ApiResponse.error('Failed to save category pricing rules')
    }
}
