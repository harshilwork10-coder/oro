import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
// GET: Fetch brand settings for the current brand owner
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor details for the current user
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'No franchisor account found' }, { status: 403 })
        }

        // Only BRAND_FRANCHISOR can access this
        if (franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return NextResponse.json({ error: 'Only Brand Franchisors can access these settings' }, { status: 403 })
        }

        return NextResponse.json({
            brandCode: franchisor.brandCode,
            brandSettings: franchisor.brandSettings ? JSON.parse(franchisor.brandSettings) : null,
            locks: {
                lockPricing: franchisor.lockPricing,
                lockServices: franchisor.lockServices,
                lockCommission: franchisor.lockCommission,
                lockProducts: franchisor.lockProducts
            }
        })
    } catch (error) {
        console.error('Error fetching brand settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT: Update brand settings
export async function PUT(req: NextRequest) {
    try {
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await req.json()

        // Validation: Brand Code (simple check)
        if (data.brandCode && data.brandCode.length < 3) {
            return NextResponse.json({ error: 'Brand code must be at least 3 characters' }, { status: 400 })
        }

        // Get franchisor details
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'No franchisor account found' }, { status: 403 })
        }

        if (franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return NextResponse.json({ error: 'Only Brand Franchisors can update these settings' }, { status: 403 })
        }

        // Check if brand code is unique (if changing)
        if (data.brandCode && data.brandCode !== franchisor.brandCode) {
            const existing = await prisma.franchisor.findUnique({
                where: { brandCode: data.brandCode }
            })
            if (existing) {
                return NextResponse.json({ error: 'Brand code is already taken' }, { status: 400 })
            }
        }

        // Prepare update data
        const updateData: any = {}

        if (typeof data.brandCode !== 'undefined') updateData.brandCode = data.brandCode.toUpperCase()
        if (typeof data.brandSettings !== 'undefined') updateData.brandSettings = JSON.stringify(data.brandSettings)

        // Locks
        if (typeof data.lockPricing !== 'undefined') updateData.lockPricing = data.lockPricing
        if (typeof data.lockServices !== 'undefined') updateData.lockServices = data.lockServices
        if (typeof data.lockCommission !== 'undefined') updateData.lockCommission = data.lockCommission
        if (typeof data.lockProducts !== 'undefined') updateData.lockProducts = data.lockProducts

        const updated = await prisma.franchisor.update({
            where: { id: franchisor.id },
            data: updateData
        })

        return NextResponse.json({
            brandCode: updated.brandCode,
            brandSettings: updated.brandSettings ? JSON.parse(updated.brandSettings) : null,
            locks: {
                lockPricing: updated.lockPricing,
                lockServices: updated.lockServices,
                lockCommission: updated.lockCommission,
                lockProducts: updated.lockProducts
            }
        })

    } catch (error) {
        console.error('Error updating brand settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
