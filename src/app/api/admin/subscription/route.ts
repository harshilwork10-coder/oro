import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Subscription tier configs
const TIER_LIMITS = {
    STARTER: { maxLocations: 1, maxUsers: 1, pulseSeatCount: 0 },
    GROWTH: { maxLocations: 1, maxUsers: 5, pulseSeatCount: 1 },
    MULTI_STORE: { maxLocations: 5, maxUsers: 10, pulseSeatCount: 3 },
    ENTERPRISE: { maxLocations: 999, maxUsers: 999, pulseSeatCount: 999 }
}

// GET: Get subscription info for a franchisor
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const franchisorId = searchParams.get('franchisorId')

        if (!franchisorId) {
            return NextResponse.json({ error: 'franchisorId required' }, { status: 400 })
        }

        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: {
                config: {
                    select: {
                        subscriptionTier: true,
                        maxLocations: true,
                        maxUsers: true,
                        pulseSeatCount: true,
                        usesMobilePulse: true
                    }
                },
                franchises: {
                    include: {
                        _count: { select: { locations: true, users: true } }
                    }
                }
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Calculate usage
        let totalLocations = 0
        let totalUsers = 0
        franchisor.franchises.forEach(f => {
            totalLocations += f._count.locations
            totalUsers += f._count.users
        })

        return NextResponse.json({
            franchisorId,
            tier: franchisor.config?.subscriptionTier || 'STARTER',
            limits: {
                maxLocations: franchisor.config?.maxLocations || 1,
                maxUsers: franchisor.config?.maxUsers || 1,
                pulseSeatCount: franchisor.config?.pulseSeatCount || 0
            },
            usage: {
                locations: totalLocations,
                users: totalUsers
            },
            features: {
                usesMobilePulse: franchisor.config?.usesMobilePulse || false
            }
        })

    } catch (error) {
        console.error('Subscription GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT: Update subscription tier for a franchisor
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { franchisorId, tier, customLimits } = body

        if (!franchisorId) {
            return NextResponse.json({ error: 'franchisorId required' }, { status: 400 })
        }

        // Validate tier
        const validTiers = ['STARTER', 'GROWTH', 'MULTI_STORE', 'ENTERPRISE']
        if (tier && !validTiers.includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
        }

        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: { config: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get limits from tier or custom
        const tierLimits = tier ? TIER_LIMITS[tier as keyof typeof TIER_LIMITS] : {}
        const limits = customLimits || tierLimits

        // Update or create config
        if (franchisor.config) {
            await prisma.businessConfig.update({
                where: { id: franchisor.config.id },
                data: {
                    subscriptionTier: tier || franchisor.config.subscriptionTier,
                    maxLocations: limits.maxLocations ?? franchisor.config.maxLocations,
                    maxUsers: limits.maxUsers ?? franchisor.config.maxUsers,
                    pulseSeatCount: limits.pulseSeatCount ?? franchisor.config.pulseSeatCount,
                    usesMobilePulse: limits.pulseSeatCount > 0 ? true : franchisor.config.usesMobilePulse
                }
            })
        } else {
            await prisma.businessConfig.create({
                data: {
                    franchisorId,
                    subscriptionTier: tier || 'STARTER',
                    maxLocations: limits.maxLocations || 1,
                    maxUsers: limits.maxUsers || 1,
                    pulseSeatCount: limits.pulseSeatCount || 0,
                    usesMobilePulse: limits.pulseSeatCount > 0
                }
            })
        }

        return NextResponse.json({
            success: true,
            message: `Subscription updated to ${tier || 'custom limits'}`,
            limits
        })

    } catch (error) {
        console.error('Subscription PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

