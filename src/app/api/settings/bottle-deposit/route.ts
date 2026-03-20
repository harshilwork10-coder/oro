// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Get bottle deposit config for current location
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const location = await prisma.location.findUnique({
            where: { id: locationId },
            select: {
                bottleDepositEnabled: true,
                bottleDepositAmount: true,
                state: true
            }
        })

        if (!location) return ApiResponse.notFound('Location not found')

        // Bottle bill states (as of 2026)
        const bottleBillStates = ['CA', 'CT', 'HI', 'IA', 'MA', 'ME', 'MI', 'NY', 'OR', 'VT']
        const stateHasBottleBill = bottleBillStates.includes((location.state || '').toUpperCase())

        // Standard deposit rates by state
        const stateRates: Record<string, number> = {
            CA: 0.05, // $0.05 for <24oz, $0.10 for 24oz+
            CT: 0.05,
            HI: 0.05,
            IA: 0.05,
            MA: 0.05,
            ME: 0.05, // $0.15 for wine/liquor
            MI: 0.10, // Highest in the US
            NY: 0.05,
            OR: 0.10,
            VT: 0.05  // $0.15 for liquor
        }

        return ApiResponse.success({
            enabled: location.bottleDepositEnabled,
            amount: location.bottleDepositAmount ? Number(location.bottleDepositAmount) : null,
            stateHasBottleBill,
            state: location.state,
            suggestedRate: stateRates[(location.state || '').toUpperCase()] || 0.05,
            bottleBillStates
        })
    } catch (error) {
        console.error('[BOTTLE_DEPOSIT_GET]', error)
        return ApiResponse.error('Failed to fetch bottle deposit config')
    }
}

// PUT — Update bottle deposit config
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const locationId = user.locationId
        if (!locationId) return ApiResponse.badRequest('No location')

        const body = await request.json()
        const { enabled, amount } = body

        await prisma.location.update({
            where: { id: locationId },
            data: {
                bottleDepositEnabled: enabled ?? false,
                bottleDepositAmount: amount != null ? amount : null
            }
        })

        return ApiResponse.success({ updated: true })
    } catch (error) {
        console.error('[BOTTLE_DEPOSIT_PUT]', error)
        return ApiResponse.error('Failed to update bottle deposit config')
    }
}
