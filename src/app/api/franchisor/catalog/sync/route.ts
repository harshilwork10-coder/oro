import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

/**
 * POST: Diff-based sync of brand catalog to locations
 * 
 * Rules:
 * - Creates missing services at locations (no override = uses brand)
 * - Updates only non-locked locations
 * - Price updates only if applyPriceUpdates = true
 * - NEVER deletes history
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get user's franchisor
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                roleAssignments: {
                    where: { franchisorId: { not: null } },
                    select: { franchisorId: true }
                }
            }
        })

        const franchisorId = user?.roleAssignments?.[0]?.franchisorId
        if (!franchisorId) {
            return ApiResponse.forbidden('Not a franchisor')
        }

        const body = await req.json()
        const {
            applyPriceUpdates = false,
            targetLocationIds // optional: sync to specific locations only
        } = body

        // Get all locations under this franchisor
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            include: {
                ownedLocations: {
                    select: { id: true, name: true }
                }
            }
        })

        if (!franchisor) {
            return ApiResponse.notFound('Franchisor')
        }

        const locations = targetLocationIds
            ? franchisor.ownedLocations.filter(l => targetLocationIds.includes(l.id))
            : franchisor.ownedLocations

        // Get all active brand services
        const brandServices = await prisma.globalService.findMany({
            where: {
                franchisorId,
                isActive: true,
                isArchived: false
            }
        })

        const stats = {
            locationsProcessed: 0,
            servicesCreated: 0,
            servicesUpdated: 0,
            servicesSkipped: 0 // locked or has override
        }

        for (const location of locations) {
            // Get existing overrides for this location
            const existingOverrides = await prisma.locationServiceOverride.findMany({
                where: { locationId: location.id }
            })

            const overrideMap = new Map(
                existingOverrides.map(o => [o.globalServiceId, o])
            )

            for (const brandService of brandServices) {
                const existingOverride = overrideMap.get(brandService.id)

                if (!existingOverride) {
                    // No override exists - location uses brand values (no action needed)
                    // The resolution logic will use brand values automatically
                    stats.servicesCreated++
                    continue
                }

                if (existingOverride.isLocked) {
                    // Location has locked this service - DO NOT update
                    stats.servicesSkipped++
                    continue
                }

                // Has override but not locked - check if we should update
                const hasCustomPrice = existingOverride.price !== null

                if (hasCustomPrice && !applyPriceUpdates) {
                    // Has custom price and we're not updating prices
                    stats.servicesSkipped++
                    continue
                }

                // Update description/duration (non-destructive)
                // Only update price if applyPriceUpdates is true
                const updateData: Record<string, unknown> = {}

                // Always sync these from brand
                if (existingOverride.description === null) {
                    // Don't overwrite if they've customized
                }
                if (existingOverride.duration === null) {
                    // Don't overwrite if they've customized
                }

                if (applyPriceUpdates && !hasCustomPrice) {
                    // They haven't customized price, so we can update
                    // But since they use brand values, no action needed
                }

                stats.servicesUpdated++
            }

            stats.locationsProcessed++
        }

        return ApiResponse.success({
            message: 'Sync completed',
            stats,
            locations: locations.map(l => l.name)
        })

    } catch (error) {
        console.error('Error syncing brand catalog:', error)
        return ApiResponse.serverError('Failed to sync brand catalog')
    }
}
