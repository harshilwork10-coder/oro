import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/loyalty/rules - List rules for a program
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const programId = searchParams.get('programId')

        // Find program by programId or franchiseId
        let where: any = {}
        if (programId) {
            where = { programId }
        } else {
            const program = await prisma.loyaltyProgram.findUnique({
                where: { franchiseId: user.franchiseId }
            })
            if (!program) return NextResponse.json({ rules: [] })
            where = { programId: program.id }
        }

        const rules = await prisma.loyaltyRule.findMany({
            where,
            orderBy: { priority: 'asc' }
        })

        return NextResponse.json({ rules })
    } catch (error) {
        console.error('[LOYALTY_RULES_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/loyalty/rules - Create a new rule
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { programId, name, type, category, upc, earnMode, pointsPerDollar, fixedPointsPerUnit, multiplier, priority } = body

        if (!programId || !name || !type) {
            return NextResponse.json({ error: 'programId, name, and type are required' }, { status: 400 })
        }

        // Verify program belongs to user's franchise
        const program = await prisma.loyaltyProgram.findFirst({
            where: { id: programId, franchiseId: user.franchiseId }
        })
        if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

        const rule = await prisma.loyaltyRule.create({
            data: {
                programId,
                name,
                type,
                category: category || null,
                upc: upc || null,
                earnMode: type === 'EXCLUSION' ? 'PER_DOLLAR' : (earnMode || 'PER_DOLLAR'),
                pointsPerDollar: type === 'EXCLUSION' ? 0 : (pointsPerDollar || null),
                fixedPointsPerUnit: fixedPointsPerUnit || null,
                multiplier: multiplier || null,
                priority: priority || 500,
            }
        })

        return NextResponse.json({ success: true, rule })
    } catch (error) {
        console.error('[LOYALTY_RULES_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH /api/loyalty/rules - Toggle rule active/inactive
export async function PATCH(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { id, isActive } = await req.json()
        if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })

        // Verify rule belongs to user's franchise
        const rule = await prisma.loyaltyRule.findUnique({
            where: { id },
            include: { program: true }
        })
        if (!rule || rule.program.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
        }

        const updated = await prisma.loyaltyRule.update({
            where: { id },
            data: { isActive }
        })

        return NextResponse.json({ success: true, rule: updated })
    } catch (error) {
        console.error('[LOYALTY_RULES_PATCH]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE /api/loyalty/rules - Delete a rule
export async function DELETE(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })

        // Verify rule belongs to user's franchise
        const rule = await prisma.loyaltyRule.findUnique({
            where: { id },
            include: { program: true }
        })
        if (!rule || rule.program.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
        }

        await prisma.loyaltyRule.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[LOYALTY_RULES_DELETE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
