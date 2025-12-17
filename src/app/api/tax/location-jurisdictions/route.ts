import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get jurisdictions assigned to a location
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
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
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
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
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
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
