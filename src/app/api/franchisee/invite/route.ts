import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST: Brand Franchisor invites a new franchisee
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized - Brand Franchisor only' }, { status: 401 })
        }

        // Verify this is a BRAND_FRANCHISOR (not a multi-store owner)
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id },
            include: { franchises: true }
        })

        if (!franchisor || franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return NextResponse.json({
                error: 'Only Brand Franchisors can invite franchisees'
            }, { status: 403 })
        }

        const { email, name, franchiseId, locationName, locationAddress } = await req.json()

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email } })

        if (user) {
            return NextResponse.json({
                error: 'User with this email already exists'
            }, { status: 400 })
        }

        // Get the franchise (use first one or specified)
        const targetFranchise = franchiseId
            ? franchisor.franchises.find(f => f.id === franchiseId)
            : franchisor.franchises[0]

        if (!targetFranchise) {
            return NextResponse.json({
                error: 'No franchise found to assign'
            }, { status: 400 })
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8)
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // Create the new franchisee user
        user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'FRANCHISEE',
                franchiseId: targetFranchise.id
            }
        })

        // If location details provided, create the location for them
        let location = null
        if (locationName && locationAddress) {
            const slug = locationName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')

            location = await prisma.location.create({
                data: {
                    name: locationName,
                    slug: `${slug}-${Date.now()}`,
                    address: locationAddress,
                    franchiseId: targetFranchise.id,
                    ownerId: user.id // Assign ownership to the franchisee
                }
            })

            // Also assign the user to this location
            await prisma.user.update({
                where: { id: user.id },
                data: { locationId: location.id }
            })
        }

        // In production: Send invitation email with temporary password

        return NextResponse.json({
            success: true,
            franchisee: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            location,
            // In production, don't return password - send via email
            tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
        })

    } catch (error) {
        console.error('Error inviting franchisee:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET: Get all franchisees for this franchisor
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id },
            include: { franchises: { select: { id: true } } }
        })

        if (!franchisor) {
            return NextResponse.json([])
        }

        const franchiseIds = franchisor.franchises.map(f => f.id)

        // Get all franchisees (users with FRANCHISEE role in this franchisor's franchises)
        const franchisees = await prisma.user.findMany({
            where: {
                role: 'FRANCHISEE',
                franchiseId: { in: franchiseIds }
            },
            include: {
                ownedLocations: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                },
                franchise: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        return NextResponse.json(franchisees)

    } catch (error) {
        console.error('Error fetching franchisees:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

