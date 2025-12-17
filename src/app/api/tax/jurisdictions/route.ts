import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all tax jurisdictions for franchise
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const jurisdictions = await prisma.taxJurisdiction.findMany({
            where: {
                franchiseId: user.franchiseId
            },
            include: {
                exciseTaxRules: true,
                _count: {
                    select: { locations: true }
                }
            },
            orderBy: [
                { priority: 'asc' },
                { type: 'asc' },
                { name: 'asc' }
            ]
        })

        return NextResponse.json({ jurisdictions })
    } catch (error) {
        console.error('[TAX_JURISDICTIONS_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch jurisdictions' }, { status: 500 })
    }
}

// POST - Create new tax jurisdiction
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const body = await request.json()
        const { name, type, code, salesTaxRate, description, priority, exciseTaxRules } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 })
        }

        // Create jurisdiction with excise rules
        const jurisdiction = await prisma.taxJurisdiction.create({
            data: {
                franchiseId: user.franchiseId,
                name: name.trim(),
                type,
                code: code?.trim() || null,
                salesTaxRate: salesTaxRate || 0,
                description: description?.trim() || null,
                priority: priority || 0,
                exciseTaxRules: exciseTaxRules?.length > 0 ? {
                    create: exciseTaxRules.map((rule: any) => ({
                        productType: rule.productType,
                        ratePerGallon: rule.ratePerGallon || null,
                        ratePerUnit: rule.ratePerUnit || null,
                        ratePerOz: rule.ratePerOz || null,
                        minAbv: rule.minAbv || null,
                        maxAbv: rule.maxAbv || null,
                        description: rule.description || null
                    }))
                } : undefined
            },
            include: {
                exciseTaxRules: true
            }
        })

        return NextResponse.json({ jurisdiction })
    } catch (error) {
        console.error('[TAX_JURISDICTIONS_POST]', error)
        return NextResponse.json({ error: 'Failed to create jurisdiction' }, { status: 500 })
    }
}
