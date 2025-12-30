import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Create a new location request (for adding locations to existing franchisors)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER or the franchisor themselves can request new locations
        if (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const {
            franchisorId,
            locationName,
            address,
            phone,
            voidCheckUrl,
            driverLicenseUrl,
            feinLetterUrl
        } = body

        if (!franchisorId || !locationName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!voidCheckUrl) {
            return NextResponse.json({ error: 'Void check is required for new locations' }, { status: 400 })
        }

        // Get the franchisor and their first franchise
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: {
                franchises: {
                    take: 1
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // If FRANCHISOR role, verify they own this franchisor
        if (session.user.role === 'FRANCHISOR' && franchisor.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden - not your account' }, { status: 403 })
        }

        // Get or create a franchise for this location
        let franchise = franchisor.franchises[0]

        if (!franchise) {
            // Create a default franchise if none exists
            const franchiseName = franchisor.name || 'Default Franchise'
            const slug = franchiseName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            franchise = await prisma.franchise.create({
                data: {
                    name: franchiseName,
                    slug,
                    franchisorId: franchisor.id,
                    approvalStatus: 'APPROVED'
                }
            })
        }

        // Create the slug for the location
        const locationSlug = locationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        // Create the location
        const location = await prisma.location.create({
            data: {
                name: locationName,
                slug: `${locationSlug}-${Date.now()}`, // Ensure uniqueness
                address: address || null,
                franchiseId: franchise.id,
            }
        })

        // Update franchisor with new documents (if provided)
        // This is a temporary solution until we add per-location document fields
        await prisma.franchisor.update({
            where: { id: franchisorId },
            data: {
                voidCheckUrl: voidCheckUrl || undefined,
                driverLicenseUrl: driverLicenseUrl || undefined,
                feinLetterUrl: feinLetterUrl || undefined,
            }
        })

        return NextResponse.json({
            success: true,
            location: {
                id: location.id,
                name: location.name,
                address: location.address
            },
            message: 'Location created successfully'
        })

    } catch (error) {
        console.error('Error creating location:', error)
        return NextResponse.json(
            { error: 'Failed to create location' },
            { status: 500 }
        )
    }
}

