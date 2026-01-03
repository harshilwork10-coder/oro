import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

// Helper to parse integrations JSON string
function parseIntegrations(integrationsStr: string | null): Record<string, boolean> {
    if (!integrationsStr) return {}
    try {
        return JSON.parse(integrationsStr)
    } catch {
        return {}
    }
}

// GET all franchisors (clients) - for Account Configs page with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        // Only PROVIDER can see all franchisors
        if (session.user.role !== 'PROVIDER') {
            return ApiResponse.forbidden()
        }

        const searchParams = request.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const search = searchParams.get('search')
        const status = searchParams.get('status')
        const businessType = searchParams.get('businessType')

        // Build where clause
        const whereClause: Record<string, unknown> = {}

        if (search) {
            whereClause.OR = [
                { name: { contains: search } },
                { owner: { email: { contains: search } } },
                { owner: { name: { contains: search } } }
            ]
        }

        if (status) {
            whereClause.accountStatus = status
        }

        if (businessType) {
            whereClause.businessType = businessType
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                },
                franchises: {
                    include: {
                        locations: {
                            include: { stations: true }
                        },
                        users: { select: { id: true } }
                    }
                },
                config: true
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const franchisors = await prisma.franchisor.findMany(
            queryArgs as Parameters<typeof prisma.franchisor.findMany>[0]
        )

        // Get location codes via raw SQL since Prisma types are stale
        const locationCodes = await prisma.$queryRaw<Array<{ id: string, pulseStoreCode: string | null }>>`
            SELECT id, pulseStoreCode FROM Location
        `
        const codeMap = new Map(locationCodes.map(l => [l.id, l.pulseStoreCode]))

        // Transform to include config and integrations from JSON fields
        const transformedData = franchisors.map(f => ({
            id: f.id,
            name: f.name,
            businessName: f.name || f.businessType,
            status: f.approvalStatus,
            accountStatus: f.accountStatus,
            approvalStatus: f.approvalStatus,
            businessType: f.businessType,
            owner: f.owner,
            franchises: f.franchises.map(fr => ({
                id: fr.id,
                name: fr.name,
                locations: fr.locations.map((loc: { id: string; name: string; slug: string; address: string; stations?: { id: string; name: string; pairingCode?: string; isActive: boolean }[] }) => ({
                    id: loc.id,
                    name: loc.name,
                    slug: loc.slug,
                    address: loc.address,
                    pulseStoreCode: codeMap.get(loc.id) || null,
                    stations: (loc.stations || []).map((s) => ({
                        id: s.id,
                        name: s.name,
                        pairingCode: s.pairingCode || null,
                        isActive: s.isActive
                    }))
                })),
                users: fr.users
            })),
            config: f.config || {},
            integrations: parseIntegrations(f.integrations),
            createdAt: f.createdAt,
            documents: {
                voidCheck: !!(f as { voidCheckUrl?: string }).voidCheckUrl,
                driverLicense: !!(f as { driverLicenseUrl?: string }).driverLicenseUrl,
                feinLetter: !!(f as { feinLetterUrl?: string }).feinLetterUrl,
            }
        }))

        const hasMore = transformedData.length > (take || 50)
        const data = hasMore ? transformedData.slice(0, take || 50) : transformedData
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return ApiResponse.paginated(data, {
            nextCursor,
            hasMore,
            total: data.length
        })
    } catch (error) {
        console.error('Error fetching franchisors:', error)
        return ApiResponse.serverError('Failed to fetch franchisors')
    }
}
