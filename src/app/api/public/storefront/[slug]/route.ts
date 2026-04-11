import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public Storefront API — /api/public/storefront/[slug]
 * 
 * Returns public-facing location + brand info for a given location slug.
 * NO authentication required — used by QR check-in pages.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
        }

        const location = await prisma.location.findFirst({
            where: { slug },
            select: {
                id: true,
                name: true,
                address: true,
                businessType: true,
                slug: true,
                franchise: {
                    select: {
                        id: true,
                        name: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true,
                                brandColorPrimary: true,
                                brandCode: true,
                            }
                        }
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        const franchisor = location.franchise?.franchisor

        return NextResponse.json({
            location: {
                id: location.id,
                name: location.name,
                address: location.address,
                businessType: location.businessType,
                slug: location.slug,
            },
            brand: franchisor ? {
                id: franchisor.id,
                name: franchisor.name,
                primaryColor: franchisor.brandColorPrimary || '#f59e0b',
                secondaryColor: franchisor.brandColorPrimary || '#d97706',
                logoUrl: null, // Add when logo storage is implemented
                welcomeText: null,
                bgGradient: 'from-orange-900/20 via-stone-950 to-stone-950',
            } : null,
            franchise: location.franchise ? {
                id: location.franchise.id,
                name: location.franchise.name,
            } : null,
        })
    } catch (error) {
        console.error('[Public Storefront] Error:', error)
        return NextResponse.json({ error: 'Failed to load storefront' }, { status: 500 })
    }
}
