import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
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
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Only PROVIDER can see all franchisors
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const searchParams = req.nextUrl.searchParams
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
                            include: {
                                stations: {
                                    include: {
                                        dedicatedTerminal: {
                                            select: { id: true, name: true, terminalIP: true, isActive: true }
                                        }
                                    }
                                }
                            }
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
        let codeMap = new Map<string, string | null>()
        try {
            const locationCodes = await prisma.$queryRaw<Array<{ id: string, pulseStoreCode: string | null }>>`
                SELECT id, "pulseStoreCode" FROM "Location"
            `
            codeMap = new Map(locationCodes.map(l => [l.id, l.pulseStoreCode]))
        } catch {
            // Column may not exist in all environments — gracefully degrade
            console.warn('[admin/franchisors] pulseStoreCode column not found, skipping')
        }

        // Transform to include config and integrations from JSON fields
        const transformedData = (franchisors as any[]).map((f: any) => ({
            id: f.id,
            name: f.name,
            businessName: f.name || f.businessType,
            status: f.approvalStatus,
            accountStatus: f.accountStatus,
            approvalStatus: f.approvalStatus,
            businessType: f.businessType,
            owner: f.owner,
            franchises: (f.franchises || []).map((fr: any) => ({
                id: fr.id,
                name: fr.name,
                locations: (fr.locations || []).map((loc: any) => ({
                    id: loc.id,
                    name: loc.name,
                    slug: loc.slug,
                    address: loc.address,
                    pulseStoreCode: codeMap.get(loc.id) || null,
                    stations: (loc.stations || []).map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        pairingCode: s.pairingCode || null,
                        isActive: s.isActive,
                        dedicatedTerminal: s.dedicatedTerminal
                            ? { id: s.dedicatedTerminal.id, name: s.dedicatedTerminal.name, terminalIP: s.dedicatedTerminal.terminalIP, isActive: s.dedicatedTerminal.isActive }
                            : null
                    }))
                })),
                users: fr.users
            })),
            config: f.config || {},
            integrations: parseIntegrations(f.integrations),
            createdAt: f.createdAt,
            processingType: f.processingType || 'POS_AND_PROCESSING',
            documents: {
                voidCheck: !!(f as { voidCheckUrl?: string }).voidCheckUrl,
                driverLicense: !!(f as { driverLicenseUrl?: string }).driverLicenseUrl,
                feinLetter: !!(f as { feinLetterUrl?: string }).feinLetterUrl,
            }
        }))

        const hasMore = transformedData.length > (take || 50)
        const data = hasMore ? transformedData.slice(0, take || 50) : transformedData
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })
    } catch (error) {
        console.error('Error fetching franchisors:', error)
        return NextResponse.json({ error: 'Failed to fetch franchisors' }, { status: 500 })
    }
}
