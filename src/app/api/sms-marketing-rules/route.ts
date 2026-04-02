import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get all marketing rules for franchise
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const rules = await prisma.smsMarketingRule.findMany({
            where: { franchiseId: authUser.franchiseId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(rules)
    } catch (error) {
        console.error('Error fetching rules:', error)
        return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }
}

// POST - Create or update a marketing rule
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!['OWNER', 'MULTI_LOCATION_OWNER', 'MANAGER', 'PROVIDER'].includes(authUser.role)) {
            return NextResponse.json({ error: 'Only owners can manage rules' }, { status: 403 })
        }

        const body = await req.json()
        const { id, name, ruleType, isActive, daysInactive, discountType, discountValue, validityDays, messageTemplate } = body

        if (id) {
            const existingRule = await prisma.smsMarketingRule.findUnique({
                where: { id },
                select: { franchiseId: true }
            })

            if (!existingRule) {
                return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
            }

            if (existingRule.franchiseId !== authUser.franchiseId) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }

            const rule = await prisma.smsMarketingRule.update({
                where: { id },
                data: { name, ruleType, isActive, daysInactive, discountType, discountValue, validityDays, messageTemplate }
            })
            return NextResponse.json(rule)
        } else {
            const rule = await prisma.smsMarketingRule.create({
                data: {
                    franchiseId: authUser.franchiseId,
                    name,
                    ruleType,
                    isActive: isActive ?? true,
                    daysInactive: daysInactive ?? 28,
                    discountType: discountType ?? 'PERCENTAGE',
                    discountValue: discountValue ?? 10,
                    validityDays: validityDays ?? 7,
                    messageTemplate
                }
            })
            return NextResponse.json(rule)
        }
    } catch (error) {
        console.error('Error saving rule:', error)
        return NextResponse.json({ error: 'Failed to save rule' }, { status: 500 })
    }
}

// DELETE - Delete a rule
export async function DELETE(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })
        }

        const rule = await prisma.smsMarketingRule.findUnique({
            where: { id },
            select: { franchiseId: true }
        })

        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
        }

        if (rule.franchiseId !== authUser.franchiseId && authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        await prisma.smsMarketingRule.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting rule:', error)
        return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }
}
