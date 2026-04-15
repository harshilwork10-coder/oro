import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Get jurisdictions assigned to a location
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        const assignments = await prisma.locationTaxJurisdiction.findMany({
            where: { locationId },
            include: {
                jurisdiction: {
                    include: {
                        exciseTaxRules: true
                    }
                }
            }
        })

        return NextResponse.json({
            assignments,
            jurisdictions: assignments.map(a => a.jurisdiction)
        })
    } catch (error) {
        console.error('[LOCATION_TAX_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }
}

// POST - Assign jurisdiction(s) to a location
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { locationId, jurisdictionIds } = body as {
            locationId: string
            jurisdictionIds: string[]
        }

        if (!locationId || !jurisdictionIds?.length) {
            return NextResponse.json({ error: 'Location ID and jurisdiction IDs required' }, { status: 400 })
        }

        // Remove existing assignments and create new ones
        await prisma.locationTaxJurisdiction.deleteMany({
            where: { locationId }
        })

        const assignments = await prisma.locationTaxJurisdiction.createMany({
            data: jurisdictionIds.map(jurisdictionId => ({
                locationId,
                jurisdictionId
            }))
        })

        return NextResponse.json({
            success: true,
            count: assignments.count
        })
    } catch (error) {
        console.error('[LOCATION_TAX_POST]', error)
        return NextResponse.json({ error: 'Failed to assign jurisdictions' }, { status: 500 })
    }
}

// DELETE - Remove a jurisdiction from a location
export async function DELETE(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')
        const jurisdictionId = searchParams.get('jurisdictionId')

        if (!locationId || !jurisdictionId) {
            return NextResponse.json({ error: 'Location ID and Jurisdiction ID required' }, { status: 400 })
        }

        await prisma.locationTaxJurisdiction.deleteMany({
            where: {
                locationId,
                jurisdictionId
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[LOCATION_TAX_DELETE]', error)
        return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 })
    }
}

