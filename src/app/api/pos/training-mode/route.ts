// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// POST — Toggle training mode for a station
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER'].includes(user.role)) {
            return ApiResponse.forbidden('Manager+ only')
        }

        const body = await request.json()
        const { stationId, enabled } = body

        if (!stationId) return ApiResponse.badRequest('stationId required')

        await prisma.station.update({
            where: { id: stationId },
            data: { trainingMode: enabled ?? false }
        })

        return ApiResponse.success({ stationId, trainingMode: enabled })
    } catch (error) {
        console.error('[TRAINING_MODE_POST]', error)
        return ApiResponse.error('Failed to toggle training mode')
    }
}

// GET — Check if current station is in training mode
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')
        if (!stationId) return ApiResponse.badRequest('stationId required')

        const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: { trainingMode: true, name: true }
        })

        return ApiResponse.success({
            stationId,
            name: station?.name,
            trainingMode: station?.trainingMode || false
        })
    } catch (error) {
        console.error('[TRAINING_MODE_GET]', error)
        return ApiResponse.error('Failed to check training mode')
    }
}
