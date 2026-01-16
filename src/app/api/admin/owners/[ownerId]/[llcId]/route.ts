import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get LLC details with its stores
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ownerId: string; llcId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { ownerId, llcId } = await params

        // Verify this LLC belongs to this owner
        const membership = await prisma.franchisorMembership.findFirst({
            where: {
                userId: ownerId,
                franchisorId: llcId
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'LLC not found for this owner' }, { status: 404 })
        }

        // Get LLC (Franchisor) with all its stores (Locations)
        const llc = await prisma.franchisor.findUnique({
            where: { id: llcId },
            select: {
                id: true,
                name: true,
                businessName: true,
                businessType: true,
                approvalStatus: true,
                accountStatus: true,
                createdAt: true,
                config: {
                    select: {
                        subscriptionTier: true,
                        usesMobileApp: true,
                        usesOroPulse: true
                    }
                },
                franchises: {
                    select: {
                        id: true,
                        slug: true,
                        locations: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                city: true,
                                state: true,
                                zipCode: true,
                                phone: true,
                                email: true,
                                isActive: true,
                                createdAt: true,
                                stations: {
                                    select: {
                                        id: true,
                                        name: true,
                                        isActive: true
                                    }
                                },
                                _count: {
                                    select: {
                                        employees: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                },
                _count: {
                    select: {
                        employees: true
                    }
                }
            }
        })

        if (!llc) {
            return NextResponse.json({ error: 'LLC not found' }, { status: 404 })
        }

        // Get owner info
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        // Flatten locations from all franchises
        const stores = llc.franchises?.flatMap(f =>
            f.locations.map(loc => ({
                id: loc.id,
                name: loc.name,
                address: loc.address,
                city: loc.city,
                state: loc.state,
                zipCode: loc.zipCode,
                phone: loc.phone,
                email: loc.email,
                isActive: loc.isActive,
                createdAt: loc.createdAt,
                stationCount: loc.stations?.length || 0,
                activeStations: loc.stations?.filter(s => s.isActive).length || 0,
                employeeCount: loc._count?.employees || 0
            }))
        ) || []

        return NextResponse.json({
            owner: {
                id: owner?.id,
                name: owner?.name,
                email: owner?.email
            },
            llc: {
                id: llc.id,
                name: llc.name,
                businessName: llc.businessName,
                businessType: llc.businessType,
                approvalStatus: llc.approvalStatus,
                accountStatus: llc.accountStatus,
                subscriptionTier: llc.config?.subscriptionTier || 'STARTER',
                totalEmployees: llc._count?.employees || 0
            },
            stores,
            storeCount: stores.length,
            activeStores: stores.filter(s => s.isActive).length
        })
    } catch (error) {
        console.error('Error fetching LLC stores:', error)
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }
}
