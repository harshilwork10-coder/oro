import { NextRequest, NextResponse } from 'next/server'
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

// PATCH: Update client integrations
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can update integrations
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { id } = await params
        const updates = await request.json()

        // Get current franchisor
        const franchisor = await prisma.franchisor.findUnique({
            where: { id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Merge new integrations with existing (parse from string)
        const currentIntegrations = parseIntegrations(franchisor.integrations)
        const newIntegrations = { ...currentIntegrations, ...updates }

        // Update integrations (store as string)
        await prisma.franchisor.update({
            where: { id },
            data: {
                integrations: JSON.stringify(newIntegrations)
            }
        })

        console.log(`[INTEGRATIONS] Provider ${session.user.email} updated integrations for client ${id}:`, updates)

        return NextResponse.json({
            success: true,
            integrations: newIntegrations
        })
    } catch (error) {
        console.error('Error updating client integrations:', error)
        return NextResponse.json(
            { error: 'Failed to update integrations' },
            { status: 500 }
        )
    }
}

// GET: Get client integrations
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                integrations: true
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: franchisor.id,
            businessName: franchisor.name || '',
            integrations: parseIntegrations(franchisor.integrations)
        })
    } catch (error) {
        console.error('Error fetching client integrations:', error)
        return NextResponse.json(
            { error: 'Failed to get integrations' },
            { status: 500 }
        )
    }
}
