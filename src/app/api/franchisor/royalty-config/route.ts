/**
 * Royalty Config API
 * GET  — fetch this franchisor's royalty configuration
 * POST — upsert royalty config (percentage, minimums, period)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.id || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            include: { royaltyConfig: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        return NextResponse.json(franchisor.royaltyConfig || null)
    } catch (error) {
        console.error('Error fetching royalty config:', error)
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.id || authUser.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: { id: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        const body = await req.json()
        const { percentage, minimumMonthlyFee, calculationPeriod } = body

        if (percentage === undefined || percentage < 0 || percentage > 100) {
            return NextResponse.json({ error: 'Valid percentage is required (0-100)' }, { status: 400 })
        }

        const config = await prisma.royaltyConfig.upsert({
            where: { franchisorId: franchisor.id },
            update: { percentage, minimumMonthlyFee, calculationPeriod },
            create: { franchisorId: franchisor.id, percentage, minimumMonthlyFee, calculationPeriod }
        })

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error saving royalty config:', error)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }
}
