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

        // Verify franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            include: { config: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Filter to only valid BusinessConfig fields
        const validFields = [
            'usesCommissions', 'usesInventory', 'usesAppointments', 'usesScheduling',
            'usesVirtualKeypad', 'usesLoyalty', 'usesGiftCards', 'usesMemberships',
            'usesReferrals', 'usesRoyalties', 'usesTipping', 'usesDiscounts',
            'taxRate', 'taxServices', 'taxProducts', 'usesRetailProducts', 'usesServices',
            'posMode', 'usesEmailMarketing', 'usesSMSMarketing', 'usesReviewManagement',
            'usesMultiLocation', 'usesFranchising', 'usesTimeTracking', 'usesPayroll',
            'usesMobilePulse', 'pulseSeatCount', 'subscriptionTier', 'maxLocations',
            'maxUsers', 'acceptsEbt', 'acceptsChecks', 'acceptsOnAccount', 'shiftRequirement',
            'enableResources'
        ]

        // Only include valid fields in the update
        const filteredUpdates: Record<string, any> = {}
        for (const key of Object.keys(updates)) {
            if (validFields.includes(key)) {
                filteredUpdates[key] = updates[key]
            }
        }

        // Upsert the BusinessConfig
        const updatedConfig = await prisma.businessConfig.upsert({
            where: { franchisorId: id },
            create: {
                franchisorId: id,
                ...filteredUpdates
            },
            update: filteredUpdates
        })

        console.log(`[CONFIG] Provider ${session.user.email} updated config for client ${id}:`, filteredUpdates)

        return NextResponse.json({
            success: true,
            config: updatedConfig
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
            config: franchisor.config || {}
        })
    } catch (error) {
        console.error('Error fetching client config:', error)
        return NextResponse.json(
            { error: 'Failed to get configuration' },
            { status: 500 }
        )
    }
}
