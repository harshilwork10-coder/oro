import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSetupCode } from '@/lib/setup-code'

// POST - Generate setup codes for all locations that don't have one
export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only OWNER, FRANCHISEE, or PROVIDER can generate codes
        const allowedRoles = ['OWNER', 'FRANCHISEE', 'PROVIDER']
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Get user's franchise context
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, role: true }
        })

        // Find locations without setup codes
        const whereClause: any = { setupCode: null }

        // PROVIDER can update all, others only their franchise
        if (user?.role !== 'PROVIDER' && user?.franchiseId) {
            whereClause.franchiseId = user.franchiseId
        }

        const locationsWithoutCodes = await prisma.location.findMany({
            where: whereClause,
            include: {
                franchise: {
                    include: {
                        franchisor: {
                            select: { name: true }
                        }
                    }
                }
            }
        })

        let generatedCount = 0
        const results: { id: string; name: string; setupCode: string }[] = []

        for (const location of locationsWithoutCodes) {
            // Generate unique code based on business name
            const businessName = location.franchise?.franchisor?.name || location.name
            let setupCode = generateSetupCode(businessName)

            // Ensure uniqueness - retry if collision
            let attempts = 0
            while (attempts < 10) {
                const existing = await prisma.location.findFirst({
                    where: { setupCode }
                })
                if (!existing) break
                setupCode = generateSetupCode(businessName)
                attempts++
            }

            // Update location with new setup code
            await prisma.location.update({
                where: { id: location.id },
                data: { setupCode }
            })

            results.push({
                id: location.id,
                name: location.name,
                setupCode
            })
            generatedCount++
        }

        return NextResponse.json({
            success: true,
            message: `Generated setup codes for ${generatedCount} locations`,
            locations: results
        })

    } catch (error) {
        console.error('Error generating setup codes:', error)
        return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
    }
}

// GET - Get setup code for current user's location(s)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { locationId: true, franchiseId: true, role: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Build query based on role
        const whereClause: any = {}
        if (user.role === 'PROVIDER') {
            // Provider sees all
        } else if (user.franchiseId) {
            whereClause.franchiseId = user.franchiseId
        } else if (user.locationId) {
            whereClause.id = user.locationId
        } else {
            return NextResponse.json({ locations: [] })
        }

        const locations = await prisma.location.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                setupCode: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ locations })

    } catch (error) {
        console.error('Error fetching setup codes:', error)
        return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 })
    }
}

