import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get owner details with their LLCs (Franchisors)
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
                createdAt: true,
            }
        })

        if (!owner) {
            return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
        }

        // Get their businesses (Franchisors) where ownerId matches
        // FranchisorMembership model doesn't exist in schema — query Franchisor directly
        const franchisors = await prisma.franchisor.findMany({
            where: { ownerId },
            include: {
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
            },
            orderBy: { createdAt: 'asc' }
        })

        // Transform data
        const result = {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            image: owner.image,
            createdAt: owner.createdAt,
            businesses: franchisors.map(f => {
                const storeCount = f.franchises?.reduce(
                    (sum: number, fr: any) => sum + (fr._count?.locations || 0), 0
                ) || 0

                const employeeCount = f.franchises?.reduce(
                    (sum: number, fr: any) => sum + (fr.locations?.reduce(
                        (locSum: number, loc: any) => locSum + (loc._count?.users || 0), 0
                    ) || 0), 0
                ) || 0

                return {
                    membershipId: f.id,
                    role: 'OWNER',
                    isPrimary: true,
                    joinedAt: f.createdAt,
                    llc: {
                        id: f.id,
                        name: f.name,
                        businessName: f.name,
                        businessType: f.businessType,
                        approvalStatus: f.approvalStatus,
                        accountStatus: f.accountStatus,
                        createdAt: f.createdAt,
                        subscriptionTier: 'STARTER',
                        usesMobileApp: false,
                        usesOroPulse: false
                    },
                    storeCount,
                    activeStores: storeCount,
                    employeeCount
                }
            })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching owner:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
            error: 'Failed to fetch owner',
            details: errorMessage
        }, { status: 500 })
    }
}
