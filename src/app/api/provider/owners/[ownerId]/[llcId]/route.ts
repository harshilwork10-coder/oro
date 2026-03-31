import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Get LLC details with its stores
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ ownerId: string; llcId: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { ownerId, llcId } = await params

        // Verify this LLC belongs to this owner
        const ownerCheck = await prisma.franchisor.findFirst({
            where: {
                id: llcId,
                ownerId
            }
        })

        if (!ownerCheck) {
            return NextResponse.json({ error: 'LLC not found for this owner' }, { status: 404 })
        }

        // Get LLC (Franchisor) with all its stores (Locations)
        // Use as any to avoid Prisma partial select type errors for optional schema fields
        const llcRaw = await prisma.franchisor.findUnique({
            where: { id: llcId },
            include: {
                franchises: {
                    include: {
                        locations: {
                            include: { stations: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        })

        if (!llcRaw) {
            return NextResponse.json({ error: 'LLC not found' }, { status: 404 })
        }

        // Cast to any for safe field access (optional/legacy schema fields)
        const llc = llcRaw as unknown as Record<string, any>

        // Get owner info
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, name: true, email: true }
        })

        // Flatten locations from all franchises
        const stores = ((llc.franchises as any[]) ?? []).flatMap((f: any) =>
            ((f.locations as any[]) ?? []).map((loc: any) => ({
                id: loc.id,
                name: loc.name,
                address: loc.address,
                isActive: loc.isActive,
                createdAt: loc.createdAt,
                stationCount: ((loc.stations as any[]) ?? []).length,
                activeStations: ((loc.stations as any[]) ?? []).filter((s: any) => s.isActive).length,
                employeeCount: 0
            }))
        )

        return NextResponse.json({
            owner: {
                id: owner?.id,
                name: owner?.name,
                email: owner?.email
            },
            llc: {
                id: llc.id,
                name: llc.name,
                businessName: llc.name,
                businessType: llc.businessType,
                approvalStatus: llc.approvalStatus,
                accountStatus: llc.accountStatus,
                subscriptionTier: 'STARTER',
                totalEmployees: 0
            },
            stores,
            storeCount: stores.length,
            activeStores: stores.filter((s: any) => s.isActive).length
        })
    } catch (error) {
        console.error('Error fetching LLC stores:', error)
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
    }
}
