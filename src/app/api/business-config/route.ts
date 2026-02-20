import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidateLocationCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Allow all authenticated users to READ config (needed for POS tax rate, etc.)
        // Only FRANCHISOR/PROVIDER can WRITE (handled in PATCH method)

        // Get user with all possible relationships to find config
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                // Direct franchisor ownership (for owners)
                franchisor: {
                    select: {
                        id: true,
                        industryType: true,
                        config: true
                    }
                },
                // Franchise relationship (for employees/managers)
                franchise: {
                    include: {
                        franchisor: {
                            select: {
                                id: true,
                                industryType: true,
                                config: true
                            }
                        }
                    }
                }
            }
        })

        // Try to find config: first check direct franchisor, then via franchise
        const franchisorConfig = user?.franchisor?.config
        const franchiseConfig = user?.franchise?.franchisor?.config
        const targetConfig = franchisorConfig || franchiseConfig

        if (!targetConfig && !user?.franchisor && !user?.franchise?.franchisor) {
            // Return default config for users without a franchisor/franchise
            return NextResponse.json({
                taxRate: 0.08,
                usesInventory: true,
                usesServices: true,
                usesRetailProducts: true,
                usesAppointments: true,
                usesTipping: true,
            })
        }

        // Determine posMode from franchisor's industryType (RETAIL → 'RETAIL', SERVICE → 'SALON')
        const franchisor = user?.franchisor || user?.franchise?.franchisor
        const industryType = franchisor?.industryType || 'SERVICE'
        const derivedPosMode = industryType === 'RETAIL' ? 'RETAIL' :
            industryType === 'RESTAURANT' ? 'RESTAURANT' : 'SALON'

        // Return existing config or default values with derived posMode
        const config = targetConfig || {
            id: null,
            franchisorId: user?.franchisor?.id || user?.franchise?.franchisorId,
            usesCommissions: true,
            usesInventory: true,
            usesAppointments: true,
            usesScheduling: true,
            usesVirtualKeypad: true,
            usesLoyalty: true,
            usesGiftCards: true,
            usesMemberships: true,
            usesReferrals: true,
            usesRoyalties: false,
            usesTipping: true,
            usesDiscounts: true,
            taxRate: 0.08,
            taxServices: true,
            taxProducts: true,
            usesRetailProducts: true,
            usesServices: true,
            posMode: derivedPosMode, // Derived from industryType, not hardcoded
            usesEmailMarketing: true,
            usesSMSMarketing: true,
            usesReviewManagement: true,
            usesMultiLocation: false,
            usesFranchising: false,
            usesTimeTracking: true,
            usesPayroll: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        return NextResponse.json(config)

    } catch (error) {
        console.error('Error fetching business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER role can update business config
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only Provider can configure business settings' }, { status: 403 })
        }

        const body = await req.json()

        // Get user's franchisor record
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisor: true
            }
        })

        if (!user?.franchisor) {
            return NextResponse.json({ error: 'No franchisor found' }, { status: 404 })
        }

        // Upsert config (create if doesn't exist, update if exists)
        const config = await prisma.businessConfig.upsert({
            where: { franchisorId: user.franchisor.id },
            create: {
                franchisorId: user.franchisor.id,
                ...body
            },
            update: body
        })

        // CRITICAL: Invalidate cache for ALL locations so Android gets updated settings IMMEDIATELY
        const allFranchises = await prisma.franchise.findMany({
            where: { franchisorId: user.franchisor.id },
            include: { locations: { select: { id: true } } }
        })
        const allLocationIds = allFranchises.flatMap(f => f.locations.map(l => l.id))
        if (allLocationIds.length > 0) {
            console.error(`[BusinessConfig] Settings update - invalidating ${allLocationIds.length} location caches`)
            for (const locId of allLocationIds) {
                await invalidateLocationCache(locId)
            }
        }

        return NextResponse.json({ success: true, config })

    } catch (error) {
        console.error('Error updating business config:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

