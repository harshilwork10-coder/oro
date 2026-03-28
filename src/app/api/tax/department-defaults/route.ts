import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Department Tax Defaults — Map categories → tax groups
 * GET /api/tax/department-defaults
 * PUT /api/tax/department-defaults — Bulk save mappings (Owner+)
 * DELETE /api/tax/department-defaults?categoryId=xxx (Owner+)
 *
 * Note: departmentTaxDefault accessed via (prisma as any) — model may not be generated.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const defaults = await prisma.departmentTaxDefault.findMany({
            where: { locationId: user.locationId },
            include: {
                category: { select: { id: true, name: true, departmentId: true } },
                taxGroup: { select: { id: true, name: true, isDefault: true } }
            },
            orderBy: { category: { name: 'asc' } }
        })

        return NextResponse.json({ defaults })
    } catch (error: any) {
        console.error('[DEPT_TAX_DEFAULTS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch department tax defaults' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { mappings } = await req.json() as { mappings: { categoryId: string; taxGroupId: string }[] }

        if (!mappings || !Array.isArray(mappings)) {
            return NextResponse.json({ error: 'mappings array required' }, { status: 400 })
        }

        const taxGroupIds = [...new Set(mappings.map(m => m.taxGroupId))]
        const validGroups = await prisma.taxGroup.findMany({
            where: { id: { in: taxGroupIds }, locationId: user.locationId },
            select: { id: true }
        })
        const validSet = new Set(validGroups.map((g: any) => g.id))
        const invalid = taxGroupIds.filter(id => !validSet.has(id))
        if (invalid.length > 0) {
            return NextResponse.json({ error: `Invalid tax group IDs: ${invalid.join(', ')}` }, { status: 400 })
        }

        const results = await prisma.$transaction(async (tx: any) => {
            const upserted = []
            for (const mapping of mappings) {
                const result = await tx.departmentTaxDefault.upsert({
                    where: { locationId_categoryId: { locationId: user.locationId, categoryId: mapping.categoryId } },
                    update: { taxGroupId: mapping.taxGroupId },
                    create: { locationId: user.locationId, categoryId: mapping.categoryId, taxGroupId: mapping.taxGroupId },
                    include: {
                        category: { select: { id: true, name: true } },
                        taxGroup: { select: { id: true, name: true } }
                    }
                })
                upserted.push(result)
            }
            return upserted
        })

        return NextResponse.json({ defaults: results, count: results.length })
    } catch (error: any) {
        console.error('[DEPT_TAX_DEFAULTS_PUT]', error)
        return NextResponse.json({ error: 'Failed to save department tax defaults' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

    try {
        await prisma.departmentTaxDefault.deleteMany({
            where: { locationId: user.locationId, categoryId }
        })
        return NextResponse.json({ deleted: true })
    } catch (error: any) {
        console.error('[DEPT_TAX_DEFAULTS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete department tax default' }, { status: 500 })
    }
}
