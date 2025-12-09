import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all marketing rules for franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        const rules = await prisma.smsMarketingRule.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(rules)
    } catch (error) {
        console.error('Error fetching rules:', error)
        return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }
}

// POST - Create or update a marketing rule
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        // Check if owner/manager
        if (!['OWNER', 'MULTI_LOCATION_OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Only owners can manage rules' }, { status: 403 })
        }

        const body = await request.json()
        const { id, name, ruleType, isActive, daysInactive, discountType, discountValue, validityDays, messageTemplate } = body

        if (id) {
            // Security: Verify rule belongs to user's franchise
            const existingRule = await prisma.smsMarketingRule.findUnique({
                where: { id },
                select: { franchiseId: true }
            })

            if (!existingRule) {
                return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
            }

            if (existingRule.franchiseId !== user.franchiseId) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }

            // Update existing rule
            const rule = await prisma.smsMarketingRule.update({
                where: { id },
                data: {
                    name,
                    ruleType,
                    isActive,
                    daysInactive,
                    discountType,
                    discountValue,
                    validityDays,
                    messageTemplate
                }
            })
            return NextResponse.json(rule)
        } else {
            // Create new rule
            const rule = await prisma.smsMarketingRule.create({
                data: {
                    franchiseId: user.franchiseId,
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
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })
        }

        // Security: Verify rule belongs to user's franchise
        const rule = await prisma.smsMarketingRule.findUnique({
            where: { id },
            select: { franchiseId: true }
        })

        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
        }

        if (rule.franchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        await prisma.smsMarketingRule.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting rule:', error)
        return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }
}
