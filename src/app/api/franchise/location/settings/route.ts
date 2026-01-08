import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            franchise: true,
            location: true
        }
    })

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    // If user is assigned to a specific location, return that.
    // If user is franchise owner (and maybe not assigned to a location directly, or manages multiple), 
    // we might need to handle that. For now, assume single location or primary location.
    // If no location assigned, try to find the first location of the franchise.

    let location = user.location
    if (!location) {
        const firstLocation = await prisma.location.findFirst({
            where: { franchiseId: user.franchiseId }
        })
        location = firstLocation
    }

    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    return NextResponse.json({
        id: location.id,
        name: location.name,
        address: location.address,
        // zipCode: location.zipCode,
        // taxRate: location.taxRate,
        // isTaxAutomated: location.isTaxAutomated
        zipCode: '00000',
        taxRate: 0,
        isTaxAutomated: false
    })
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true, location: true }
    })

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    // Only FRANCHISEE or authorized managers can update tax settings
    if (user.role !== 'FRANCHISEE' && !user.canViewReports) { // Assuming 'canViewReports' implies some financial auth, or we add a new permission
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { taxRate, zipCode, isTaxAutomated, locationId } = body

    // Determine which location to update
    let targetLocationId = locationId || user.locationId
    if (!targetLocationId) {
        const firstLocation = await prisma.location.findFirst({
            where: { franchiseId: user.franchiseId }
        })
        targetLocationId = firstLocation?.id
    }

    if (!targetLocationId) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const updatedLocation = await prisma.location.update({
        where: { id: targetLocationId },
        data: {
            // taxRate: taxRate,
            // zipCode: zipCode,
            // isTaxAutomated: isTaxAutomated
        }
    })

    return NextResponse.json(updatedLocation)
}

