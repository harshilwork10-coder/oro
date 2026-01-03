import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Create a new location request (for adding locations to existing franchisors)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            // Legacy flow (provider/franchisor session)
            franchisorId,
            // Magic link flow
            franchiseId,
            token,
            // Common fields
            locationName,
            address,
            phone,
            voidCheckUrl,
            driverLicenseUrl,
            feinLetterUrl
        } = body

        if (!locationName) {
            return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
        }

        if (!voidCheckUrl) {
            return NextResponse.json({ error: 'Void check is required for new locations' }, { status: 400 })
        }

        let franchise: any = null
        let franchisor: any = null

        // Magic link flow - verify token and get franchise directly
        if (token && franchiseId) {
            // Verify the magic link token
            const magicLink = await prisma.magicLink.findUnique({
                where: { token },
                include: { user: true }
            })

            if (!magicLink || magicLink.expiresAt < new Date()) {
                return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
            }

            // Get the franchise
            franchise = await prisma.franchise.findUnique({
                where: { id: franchiseId },
                include: { franchisor: true }
            })

            if (!franchise || franchise.franchisor.ownerId !== magicLink.userId) {
                return NextResponse.json({ error: 'Invalid franchise access' }, { status: 403 })
            }

            franchisor = franchise.franchisor
        } else {
            // Session-based flow
            const session = await getServerSession(authOptions)

            if (!session?.user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            if (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            if (!franchisorId) {
                return NextResponse.json({ error: 'Missing franchisor ID' }, { status: 400 })
            }

            // Get the franchisor and their first franchise
            franchisor = await prisma.franchisor.findUnique({
                where: { id: franchisorId },
                include: { franchises: { take: 1 } }
            })

            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
            }

            if (session.user.role === 'FRANCHISOR' && franchisor.ownerId !== session.user.id) {
                return NextResponse.json({ error: 'Forbidden - not your account' }, { status: 403 })
            }

            franchise = franchisor.franchises[0]
        }

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

