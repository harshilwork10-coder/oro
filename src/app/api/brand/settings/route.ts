import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET: Fetch brand settings for the current brand owner
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get franchisor details for the current user
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return ApiResponse.forbidden("No franchisor account found")
        }

        // Only BRAND_FRANCHISOR can access this
        if (franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return ApiResponse.forbidden("Only Brand Franchisors can access these settings")
        }

        return ApiResponse.success({
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
        return ApiResponse.serverError()
    }
}

// PUT: Update brand settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        const data = await request.json()

        // Validation: Brand Code (simple check)
        if (data.brandCode && data.brandCode.length < 3) {
            return ApiResponse.badRequest("Brand code must be at least 3 characters")
        }

        // Get franchisor details
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return ApiResponse.forbidden("No franchisor account found")
        }

        if (franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return ApiResponse.forbidden("Only Brand Franchisors can update these settings")
        }

        // Check if brand code is unique (if changing)
        if (data.brandCode && data.brandCode !== franchisor.brandCode) {
            const existing = await prisma.franchisor.findUnique({
                where: { brandCode: data.brandCode }
            })
            if (existing) {
                return ApiResponse.badRequest("Brand code is already taken")
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

        return ApiResponse.success({
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
        return ApiResponse.serverError()
    }
}
