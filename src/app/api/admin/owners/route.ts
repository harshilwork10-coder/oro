import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: List all owners (users with franchisor memberships)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')?.toLowerCase()

        // Get all users who have at least one franchisor membership
        const owners = await prisma.user.findMany({
            where: {
                franchisorMemberships: {
                    some: {}
                },
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
                franchisorMemberships: {
                    select: {
                        id: true,
                        role: true,
                        isPrimary: true,
                        franchisor: {
                            select: {
                                id: true,
                                name: true,
                                businessType: true,
                                approvalStatus: true,
                                franchises: {
                                    select: {
                                        locations: {
                                            select: { id: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Transform data for frontend
        const result = owners.map(owner => {
            // Count total LLCs (franchisors)
            const llcCount = owner.franchisorMemberships.length

            // Count total stores across all LLCs
            const storeCount = owner.franchisorMemberships.reduce((total, m) => {
                const locationsFromFranchises = m.franchisor.franchises?.reduce(
                    (sum, f) => sum + (f.locations?.length || 0), 0
                ) || 0
                return total + locationsFromFranchises
            }, 0)

            // Get primary LLC if any
            const primaryMembership = owner.franchisorMemberships.find(m => m.isPrimary)

            return {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                image: owner.image,
                createdAt: owner.createdAt,
                llcCount,
                storeCount,
                primaryLlc: primaryMembership?.franchisor.name || null,
                memberships: owner.franchisorMemberships.map(m => ({
                    id: m.id,
                    role: m.role,
                    isPrimary: m.isPrimary,
                    llcId: m.franchisor.id,
                    llcName: m.franchisor.name,
                    businessType: m.franchisor.businessType,
                    approvalStatus: m.franchisor.approvalStatus
                }))
            }
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching owners:', error)
        return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 })
    }
}
