// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { DEFAULT_PRICING_RULES } from '@/lib/pricing-engine'

// GET — List pricing rules for current location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const rules = await (prisma as any).pricingRule.findMany({
            where: { locationId },
            include: {
                _count: { select: { categoryRules: true } }
            },
            orderBy: { name: 'asc' }
        })

        return ApiResponse.success({ rules })
    } catch (error) {
        console.error('[PRICING_RULES_GET]', error)
        return ApiResponse.error('Failed to fetch pricing rules')
    }
}

// POST — Create a pricing rule (or seed defaults)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage pricing rules')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()

        // Special action: seed all 9 default rules
        if (body.action === 'SEED_DEFAULTS') {
            const created = []
            for (const [name, config] of Object.entries(DEFAULT_PRICING_RULES)) {
                // Map name to label
                const labels: Record<string, string> = {
                    BEER_PACKS: 'Beer Packs (6/12/24)',
                    BEER_SINGLES: 'Beer Singles / Tallboys',
                    SPIRITS: 'Liquor / Spirits',
                    WINE: 'Wine',
                    PACKAGED_BEVERAGES: 'Non-Alcohol Beverages',
                    SNACKS_CANDY: 'Snacks / Candy',
                    TOBACCO_CIG: 'Cigarettes',
                    TOBACCO_OTHER_VAPE: 'Other Tobacco / Vape',
                    GROCERY_GENERAL: 'General Grocery / Household'
                }

                try {
                    const rule = await (prisma as any).pricingRule.create({
                        data: {
                            locationId,
                            name,
                            label: labels[name] || name,
                            method: config.method,
                            config: {
                                tiers: config.tiers,
                                rounding: config.rounding,
                                caps: config.caps,
                                lockIfMsrpPresent: config.lockIfMsrpPresent || false,
                                managerOverrideOnly: config.managerOverrideOnly || false
                            }
                        }
                    })
                    created.push(rule)
                } catch (err: any) {
                    // Skip duplicates (P2002)
                    if (err?.code !== 'P2002') throw err
                }
            }
            return ApiResponse.success({ seeded: created.length, rules: created })
        }

        // Normal create
        const { name, label, method, config } = body
        if (!name?.trim() || !label?.trim()) {
            return ApiResponse.badRequest('Name and label are required')
        }

        const rule = await (prisma as any).pricingRule.create({
            data: {
                locationId,
                name: name.trim().toUpperCase(),
                label: label.trim(),
                method: method || 'MARKUP',
                config: config || {
                    tiers: [{ minCost: 0, maxCost: 999999, markupPct: 0.30, minGrossProfit: 1.00 }],
                    rounding: 'UP_TO_99',
                    caps: { minPrice: 0.99, maxMarkupPct: 1.00 }
                }
            }
        })

        return ApiResponse.success({ rule })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return ApiResponse.badRequest('A pricing rule with that name already exists')
        }
        console.error('[PRICING_RULES_POST]', error)
        return ApiResponse.error('Failed to create pricing rule')
    }
}

// PUT — Update a pricing rule
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage pricing rules')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const body = await request.json()
        const { id, label, method, config } = body
        if (!id) return ApiResponse.badRequest('Rule ID is required')

        // Verify ownership
        const existing = await (prisma as any).pricingRule.findFirst({
            where: { id, locationId }
        })
        if (!existing) return ApiResponse.notFound('Pricing rule not found')

        const rule = await (prisma as any).pricingRule.update({
            where: { id },
            data: {
                ...(label ? { label: label.trim() } : {}),
                ...(method ? { method } : {}),
                ...(config ? { config } : {})
            }
        })

        return ApiResponse.success({ rule })
    } catch (error) {
        console.error('[PRICING_RULES_PUT]', error)
        return ApiResponse.error('Failed to update pricing rule')
    }
}

// DELETE — Delete a pricing rule
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Only owners can manage pricing rules')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location associated')

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return ApiResponse.badRequest('Rule ID is required')

        const existing = await (prisma as any).pricingRule.findFirst({
            where: { id, locationId }
        })
        if (!existing) return ApiResponse.notFound('Pricing rule not found')

        await (prisma as any).pricingRule.delete({ where: { id } })

        return ApiResponse.success({ deleted: true })
    } catch (error) {
        console.error('[PRICING_RULES_DELETE]', error)
        return ApiResponse.error('Failed to delete pricing rule')
    }
}
