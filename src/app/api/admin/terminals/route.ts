import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Fetch terminals with full relation chain
        const allTerminals = await prisma.terminal.findMany({
            select: {
                id: true,
                serialNumber: true,
                model: true,
                status: true,
                locationId: true,
                ipAddress: true,
                macAddress: true,
                createdAt: true,
                updatedAt: true,
                location: {
                    select: {
                        name: true,
                        franchise: {
                            select: {
                                name: true,
                                franchisorId: true,
                                franchisor: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Filter to only return terminals linked to valid franchisors
        const terminals = allTerminals.filter(t =>
            t.location?.franchise?.franchisorId && t.location?.franchise?.franchisor
        )

        return NextResponse.json({ terminals })
    } catch (error) {
        console.error('Fetch terminals error:', error)
        return NextResponse.json({ error: 'Failed to fetch terminals' }, { status: 500 })
    }
}

