import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get owner details with their LLCs
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ownerId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { ownerId } = await params

        // Get owner basic info
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
                createdAt: true,
            }
        })

        if (!owner) {
            return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
        }

        // Get their business memberships separately
        const memberships = await prisma.franchisorMembership.findMany({
            where: { userId: ownerId },
            include: {
                franchisor: {
                    include: {
                        config: {
                            select: {
                                subscriptionTier: true,
                                usesMobileApp: true,
                                usesOroPulse: true
                            }
                        },
                        franchises: {
                            include: {
                                locations: {
                                    select: {
                                        id: true,
                                        _count: {
                                            select: { users: true }
                                        }
                                    }
                                },
                                _count: {
                                    select: { locations: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { isPrimary: 'desc' },
                { createdAt: 'asc' }
            ]
        })

        // Transform data
        const result = {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            image: owner.image,
            phone: owner.phone,
            createdAt: owner.createdAt,
            businesses: memberships.map(m => {
                // Count locations across all franchises
                const storeCount = m.franchisor.franchises?.reduce(
                    (sum: number, f: any) => sum + (f._count?.locations || 0), 0
                ) || 0

                // Count employees across all locations in all franchises
                const employeeCount = m.franchisor.franchises?.reduce(
                    (sum: number, f: any) => sum + (f.locations?.reduce(
                        (locSum: number, loc: any) => locSum + (loc._count?.users || 0), 0
                    ) || 0), 0
                ) || 0

                return {
                    membershipId: m.id,
                    role: m.role,
                    isPrimary: m.isPrimary,
                    joinedAt: m.createdAt,
                    llc: {
                        id: m.franchisor.id,
                        name: m.franchisor.name,
                        businessName: m.franchisor.businessName,
                        businessType: m.franchisor.businessType,
                        approvalStatus: m.franchisor.approvalStatus,
                        accountStatus: m.franchisor.accountStatus,
                        createdAt: m.franchisor.createdAt,
                        subscriptionTier: m.franchisor.config?.subscriptionTier || 'STARTER',
                        usesMobileApp: m.franchisor.config?.usesMobileApp || false,
                        usesOroPulse: m.franchisor.config?.usesOroPulse || false
                    },
                    storeCount,
                    activeStores: storeCount, // All stores considered active
                    employeeCount
                }
            })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching owner:', error)
        // Return detailed error in development
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
            error: 'Failed to fetch owner',
            details: errorMessage
        }, { status: 500 })
    }
}

