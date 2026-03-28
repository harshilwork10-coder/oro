import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Tax Groups — CRUD for tax groups at a location
 * GET /api/tax/groups — List groups with components
 * POST /api/tax/groups — Create (Owner+)
 * PUT /api/tax/groups — Update (Owner+)
 * DELETE /api/tax/groups?id=xxx — Delete (Owner+)
 *
 * Note: taxGroup, taxGroupComponent are accessed via (prisma as any) because
 * these models may not be in the generated Prisma client yet.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const taxGroups = await prisma.taxGroup.findMany({
            where: { locationId: user.locationId },
            include: {
                components: {
                    include: {
                        jurisdiction: {
                            select: { id: true, name: true, type: true, salesTaxRate: true, effectiveFrom: true, isActive: true, priority: true }
                        }
                    },
                    orderBy: { compoundOrder: 'asc' }
                },
                _count: { select: { departmentDefaults: true } }
            },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
        })

        return NextResponse.json({ taxGroups })
    } catch (error: any) {
        console.error('[TAX_GROUPS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch tax groups' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { name, isDefault, componentIds } = body as {
            name: string; isDefault?: boolean
            componentIds?: { jurisdictionId: string; compoundOrder?: number }[]
        }

        if (!name?.trim()) return NextResponse.json({ error: 'Tax group name required' }, { status: 400 })

        if (isDefault) {
            await prisma.taxGroup.updateMany({
                where: { locationId: user.locationId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const taxGroup = await prisma.taxGroup.create({
            data: {
                locationId: user.locationId,
                name: name.trim().toUpperCase(),
                isDefault: isDefault || false,
                components: componentIds?.length ? {
                    create: componentIds.map(c => ({
                        jurisdictionId: c.jurisdictionId,
                        compoundOrder: c.compoundOrder || 0
                    }))
                } : undefined
            },
            include: { components: { include: { jurisdiction: true }, orderBy: { compoundOrder: 'asc' } } }
        })

        return NextResponse.json({ taxGroup })
    } catch (error: any) {
        if (error?.code === 'P2002') return NextResponse.json({ error: 'Tax group name already exists' }, { status: 400 })
        console.error('[TAX_GROUPS_POST]', error)
        return NextResponse.json({ error: 'Failed to create tax group' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, name, isDefault, componentIds } = body as {
            id: string; name?: string; isDefault?: boolean
            componentIds?: { jurisdictionId: string; compoundOrder?: number }[]
        }

        if (!id) return NextResponse.json({ error: 'Tax group ID required' }, { status: 400 })

        const existing = await prisma.taxGroup.findFirst({ where: { id, locationId: user.locationId } })
        if (!existing) return NextResponse.json({ error: 'Tax group not found' }, { status: 404 })

        if (isDefault) {
            await prisma.taxGroup.updateMany({
                where: { locationId: user.locationId, isDefault: true, id: { not: id } },
                data: { isDefault: false }
            })
        }

        if (componentIds !== undefined) {
            await prisma.taxGroupComponent.deleteMany({ where: { taxGroupId: id } })
            if (componentIds.length > 0) {
                await prisma.taxGroupComponent.createMany({
                    data: componentIds.map(c => ({
                        taxGroupId: id, jurisdictionId: c.jurisdictionId, compoundOrder: c.compoundOrder || 0
                    }))
                })
            }
        }

        const taxGroup = await prisma.taxGroup.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim().toUpperCase() } : {}),
                ...(isDefault !== undefined ? { isDefault } : {})
            },
            include: { components: { include: { jurisdiction: true }, orderBy: { compoundOrder: 'asc' } } }
        })

        return NextResponse.json({ taxGroup })
    } catch (error: any) {
        console.error('[TAX_GROUPS_PUT]', error)
        return NextResponse.json({ error: 'Failed to update tax group' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Tax group ID required' }, { status: 400 })

    try {
        const existing = await prisma.taxGroup.findFirst({ where: { id, locationId: user.locationId } })
        if (!existing) return NextResponse.json({ error: 'Tax group not found' }, { status: 404 })

        await prisma.taxGroup.delete({ where: { id } })
        return NextResponse.json({ deleted: true })
    } catch (error: any) {
        console.error('[TAX_GROUPS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete tax group' }, { status: 500 })
    }
}
