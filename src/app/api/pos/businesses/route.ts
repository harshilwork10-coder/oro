import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all businesses for terminal setup (no auth required for PIN login)
export async function GET() {
    try {
        // Get all approved franchisors with their franchises and locations
        const franchisors = await prisma.franchisor.findMany({
            where: {
                approvalStatus: 'APPROVED'
            },
            include: {
                franchises: {
                    include: {
                        locations: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        // Transform to business format
        const businesses = franchisors.map(franchisor => ({
            id: franchisor.id,
            name: franchisor.name || franchisor.businessType,
            industryType: franchisor.industryType || 'RETAIL',
            locations: franchisor.franchises.flatMap(f => f.locations)
        })).filter(b => b.locations.length > 0)

        return NextResponse.json({ businesses })
    } catch (error) {
        console.error('Error fetching businesses:', error)
        return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 })
    }
}
