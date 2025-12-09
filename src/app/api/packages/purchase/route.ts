import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Sell a package to a customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId

        const body = await request.json()
        const { packageId, clientId, transactionId } = body

        if (!packageId || !clientId) {
            return NextResponse.json({ error: 'Package ID and Client ID required' }, { status: 400 })
        }

        // Verify package exists and belongs to franchise
        const pkg = await prisma.servicePackage.findFirst({
            where: { id: packageId, franchiseId, isActive: true }
        })

        if (!pkg) {
            return NextResponse.json({ error: 'Package not found or inactive' }, { status: 404 })
        }

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Calculate expiry date
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + pkg.validityDays)

        // Create purchase record
        const purchase = await prisma.packagePurchase.create({
            data: {
                packageId,
                clientId,
                sessionsRemaining: pkg.sessionsIncluded,
                expiresAt,
                transactionId
            },
            include: {
                package: { select: { name: true, sessionsIncluded: true } },
                client: { select: { firstName: true, lastName: true } }
            }
        })

        return NextResponse.json(purchase, { status: 201 })
    } catch (error) {
        console.error('Error selling package:', error)
        return NextResponse.json({ error: 'Failed to sell package' }, { status: 500 })
    }
}

// GET - Get client's active packages
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { searchParams } = new URL(request.url)
        const clientId = searchParams.get('clientId')

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
        }

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        const purchases = await prisma.packagePurchase.findMany({
            where: {
                clientId,
                sessionsRemaining: { gt: 0 },
                expiresAt: { gt: new Date() }
            },
            include: {
                package: {
                    select: { name: true, sessionsIncluded: true, service: { select: { id: true, name: true } } }
                }
            },
            orderBy: { expiresAt: 'asc' }
        })

        return NextResponse.json(purchases)
    } catch (error) {
        console.error('Error fetching client packages:', error)
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }
}
