import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get tax jurisdictions for a location
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: locationId } = await params

        const jurisdictions = await prisma.locationTaxJurisdiction.findMany({
            where: { locationId },
            include: {
                jurisdiction: true
            },
            orderBy: { priority: 'asc' }
        })

        return NextResponse.json({ jurisdictions })
    } catch (error) {
        console.error('Error fetching tax jurisdictions:', error)
        return NextResponse.json({ error: 'Failed to fetch tax jurisdictions' }, { status: 500 })
    }
}

// POST: Add a new tax jurisdiction to a location
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: locationId } = await params
        const body = await request.json()

        const {
            displayName,
            rate, // e.g. 8.25 for 8.25%
            appliesProducts = true,
            appliesServices = false,
            appliesFood = false,
            appliesAlcohol = false,
            priority = 0
        } = body

        if (rate === undefined || rate < 0 || rate > 100) {
            return NextResponse.json({ error: 'Invalid tax rate' }, { status: 400 })
        }

        // Verify location exists
        const location = await prisma.location.findUnique({
            where: { id: locationId }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Create or find the tax jurisdiction
        const jurisdictionName = displayName || `Tax ${rate}%`
        const jurisdictionCode = `CUSTOM_${locationId}_${Date.now()}`

        // Create the base jurisdiction
        const jurisdiction = await prisma.taxJurisdiction.create({
            data: {
                name: jurisdictionName,
                code: jurisdictionCode,
                rate: rate / 100, // Store as decimal
                type: 'SALES',
                isActive: true
            }
        })

        // Create the location-jurisdiction link
        const locationJurisdiction = await prisma.locationTaxJurisdiction.create({
            data: {
                locationId,
                jurisdictionId: jurisdiction.id,
                displayName,
                priority,
                appliesProducts,
                appliesServices,
                appliesFood,
                appliesAlcohol,
                isActive: true
            },
            include: {
                jurisdiction: true
            }
        })

        // Audit log
        const user = session.user as any
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                entityType: 'LOCATION_TAX',
                entityId: locationId,
                action: 'CREATED',
                changes: JSON.stringify({
                    displayName,
                    rate,
                    appliesProducts,
                    appliesServices,
                    appliesFood,
                    appliesAlcohol
                }),
                status: 'SUCCESS'
            }
        })

        return NextResponse.json({
            success: true,
            jurisdiction: locationJurisdiction
        })
    } catch (error) {
        console.error('Error creating tax jurisdiction:', error)
        return NextResponse.json({ error: 'Failed to create tax jurisdiction' }, { status: 500 })
    }
}

// DELETE: Remove a tax jurisdiction from a location
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: locationId } = await params
        const url = new URL(request.url)
        const jurisdictionId = url.searchParams.get('jurisdictionId')

        if (!jurisdictionId) {
            return NextResponse.json({ error: 'Jurisdiction ID required' }, { status: 400 })
        }

        // Delete the link
        await prisma.locationTaxJurisdiction.deleteMany({
            where: {
                locationId,
                id: jurisdictionId
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting tax jurisdiction:', error)
        return NextResponse.json({ error: 'Failed to delete tax jurisdiction' }, { status: 500 })
    }
}
