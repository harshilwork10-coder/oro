import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Validate setup code and return business/location info
export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json()

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Setup code is required' }, { status: 400 })
        }

        const cleanCode = code.toUpperCase().trim()

        // Find location by setup code
        const location = await prisma.location.findFirst({
            where: {
                setupCode: cleanCode
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        storeLogo: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true,
                                industryType: true
                            }
                        }
                    }
                }
            }
        })

        if (!location) {
            // Don't reveal if code exists or not - generic error
            return NextResponse.json({ error: 'Invalid setup code' }, { status: 400 })
        }

        const franchisor = location.franchise?.franchisor

        return NextResponse.json({
            success: true,
            business: {
                id: franchisor?.id || location.franchiseId,
                name: franchisor?.name || 'Business',
                industryType: franchisor?.industryType || 'RETAIL',
                logo: location.franchise?.storeLogo || null
            },
            location: {
                id: location.id,
                name: location.name
            }
        })

    } catch (error) {
        console.error('Setup code validation error:', error)
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
    }
}
