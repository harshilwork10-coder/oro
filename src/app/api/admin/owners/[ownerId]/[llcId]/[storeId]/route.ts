import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get store details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ownerId: string; llcId: string; storeId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { ownerId, llcId, storeId } = await params

        // Verify hierarchy
        const membership = await prisma.franchisorMembership.findFirst({
            where: {
                userId: ownerId,
                franchisorId: llcId
            }
        })

        if (!membership) {
            return NextResponse.json({ error: 'Invalid hierarchy' }, { status: 404 })
        }

        // Get store (location) with all details - using actual Location model fields
        const store = await prisma.location.findUnique({
            where: { id: storeId },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                businessType: true,
                setupCode: true,
                voidCheckUrl: true,
                publicName: true,
                publicDescription: true,
                publicPhone: true,
                operatingHours: true,
                showInDirectory: true,
                publicLogoUrl: true,
                createdAt: true,
                updatedAt: true,
                stations: {
                    select: {
                        id: true,
                        name: true,
                        pairingCode: true,
                        isActive: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'asc' }
                },
                franchise: {
                    select: {
                        id: true,
                        slug: true
                    }
                }
            }
        })

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 })
        }

        // Get owner and LLC info
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, name: true, email: true }
        })

        const llc = await prisma.franchisor.findUnique({
            where: { id: llcId },
            select: { id: true, name: true, businessType: true }
        })

        // Get employees for this location
        const employees = await prisma.employee.findMany({
            where: { locationId: storeId },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            owner: {
                id: owner?.id,
                name: owner?.name,
                email: owner?.email
            },
            llc: {
                id: llc?.id,
                name: llc?.name,
                businessType: llc?.businessType
            },
            store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
                address: store.address,
                businessType: store.businessType,
                setupCode: store.setupCode,
                publicPhone: store.publicPhone,
                operatingHours: store.operatingHours,
                showInDirectory: store.showInDirectory,
                createdAt: store.createdAt,
                updatedAt: store.updatedAt,
                franchiseId: store.franchise?.id,
                franchiseSlug: store.franchise?.slug
            },
            stations: store.stations,
            employees: employees.map((e: { id: string; user: { id: string; name: string | null; email: string } | null }) => ({
                id: e.id,
                userId: e.user?.id,
                name: e.user?.name,
                email: e.user?.email
            })),
            // Documents would need to be stored separately - placeholder for now
            documents: []
        })
    } catch (error) {
        console.error('Error fetching store:', error)
        return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
    }
}
