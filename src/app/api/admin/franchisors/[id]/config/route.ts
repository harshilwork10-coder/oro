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
            'enableResources', 'tipType', 'tipSuggestions',
            // Premium subscription features
            'usesMobileApp', 'usesOroPulse', 'usesAdvancedReports',
            // Pricing fields
            'cashDiscountEnabled', 'cashDiscountPercent', 'pricingModel',
            'cardSurchargeType', 'cardSurcharge', 'showDualPricing',
            // Tax Configuration fields
            'servicesTaxableDefault', 'productsTaxableDefault', 'taxInclusive', 'roundingRule'
        ]

        // Handle storeLogo and pricing settings - sync to FranchiseSettings (used by POS)
        const pricingFields = ['pricingModel', 'cardSurchargeType', 'cardSurcharge', 'showDualPricing']
        const hasPricingUpdate = pricingFields.some(f => updates[f] !== undefined)

        if (updates.storeLogo !== undefined || hasPricingUpdate) {
            const franchise = await prisma.franchise.findFirst({
                where: { franchisorId: id }
            })
            if (franchise) {
                const settingsUpdate: Record<string, any> = {}
                if (updates.storeLogo !== undefined) settingsUpdate.storeLogo = updates.storeLogo
                if (updates.pricingModel !== undefined) settingsUpdate.pricingModel = updates.pricingModel
                if (updates.cardSurchargeType !== undefined) settingsUpdate.cardSurchargeType = updates.cardSurchargeType
                if (updates.cardSurcharge !== undefined) settingsUpdate.cardSurcharge = parseFloat(String(updates.cardSurcharge)) || 0
                if (updates.showDualPricing !== undefined) settingsUpdate.showDualPricing = updates.showDualPricing

                await prisma.franchiseSettings.upsert({
                    where: { franchiseId: franchise.id },
                    create: { franchiseId: franchise.id, ...settingsUpdate },
                    update: settingsUpdate
                })
            }
        }

        // Only include valid fields in the update
        const filteredUpdates: Record<string, any> = {}
        for (const key of Object.keys(updates)) {
            if (validFields.includes(key)) {
                filteredUpdates[key] = updates[key]
            }
        }

        // Convert Decimal fields to proper format for Prisma
        const decimalFields = ['cardSurcharge', 'cashDiscountPercent', 'taxRate']
        for (const field of decimalFields) {
            if (filteredUpdates[field] !== undefined) {
                // Ensure it's a number and convert to Decimal-compatible format
                filteredUpdates[field] = parseFloat(String(filteredUpdates[field])) || 0
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

        // Log the change to audit trail
        const user = session.user as any
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                entityType: 'FRANCHISOR_CONFIG',
                entityId: id,
                action: 'UPDATED',
                changes: JSON.stringify({
                    oldValues: franchisor.config || {},
                    newValues: filteredUpdates,
                    fields: Object.keys(filteredUpdates)
                }),
                status: 'SUCCESS'
            }
        })

        // Debug log removed

        return NextResponse.json({
            success: true,
            config: updatedConfig
        })
    } catch (error) {
        console.error('Error updating client config:', error)
        console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
        return NextResponse.json(
            { error: 'Failed to update configuration', details: String(error) },
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
