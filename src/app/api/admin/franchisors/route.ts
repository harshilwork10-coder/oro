import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to parse integrations JSON string
function parseIntegrations(integrationsStr: string | null): Record<string, boolean> {
    if (!integrationsStr) return {}
    try {
        return JSON.parse(integrationsStr)
    } catch {
        return {}
    }
}

// GET all franchisors (clients) - for Account Configs page
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can see all franchisors
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const franchisors = await prisma.franchisor.findMany({
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                franchises: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                config: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Transform to include config and integrations from JSON fields
        const result = franchisors.map(f => ({
            id: f.id,
            name: f.name,
            businessName: f.name || f.businessType,
            status: f.approvalStatus,
            businessType: f.businessType,
            owner: f.owner,
            franchises: f.franchises,
            config: f.config || {},
            integrations: parseIntegrations(f.integrations),
            createdAt: f.createdAt
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching franchisors:', error)
        return NextResponse.json(
            { error: 'Failed to fetch franchisors' },
            { status: 500 }
        )
    }
}

