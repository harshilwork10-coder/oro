import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH: Update client feature configuration
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can update client configs
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

        // Merge new config with existing
        const currentConfig = (franchisor as any).config || {}
        const newConfig = { ...currentConfig, ...updates }

        // Update the config
        const updated = await prisma.franchisor.update({
            where: { id },
            data: {
                config: newConfig
            } as any
        })

        console.log(`[CONFIG] Provider ${session.user.email} updated config for client ${id}:`, updates)

        return NextResponse.json({
            success: true,
            config: newConfig
        })
    } catch (error) {
        console.error('Error updating client config:', error)
        return NextResponse.json(
            { error: 'Failed to update configuration' },
            { status: 500 }
        )
    }
}

// GET: Get client configuration
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
                config: true
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: franchisor.id,
            businessName: franchisor.name || '',
            config: (franchisor as any).config || {}
        })
    } catch (error) {
        console.error('Error fetching client config:', error)
        return NextResponse.json(
            { error: 'Failed to get configuration' },
            { status: 500 }
        )
    }
}
