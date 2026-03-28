/**
 * Client Membership Lookup API
 * GET /api/pos/memberships/client/[clientId]
 * 
 * Returns active membership and package balances for a client.
 * Used by Android checkout to auto-apply membership discounts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { clientId: string } }
) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.clientId

    try {
        // Get active memberships for this client
        const memberships = await prisma.clientMembership.findMany({
            where: {
                clientId,
                status: 'ACTIVE',
                plan: { franchiseId: user.franchiseId }
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        billingInterval: true,
                        includedServices: true
                    }
                }
            }
        })

        // Get active package purchases for this client
        const packagePurchases = await prisma.packagePurchase.findMany({
            where: {
                clientId,
                package: { franchiseId: user.franchiseId }
            },
            include: {
                package: {
                    select: {
                        id: true,
                        name: true,
                        serviceId: true,
                        sessionsIncluded: true
                    }
                },
                usages: true
            }
        })

        // Format membership response
        const activeMemberships = memberships.map(m => ({
            id: m.id,
            planId: m.plan.id,
            planName: m.plan.name,
            monthlyPrice: Number(m.plan.price),
            billingCycle: m.plan.billingInterval || 'MONTHLY',
            includedServices: m.plan.includedServices
                ? m.plan.includedServices.split(',').map((s: string) => s.trim())
                : [],
            nextBillingDate: m.nextBillingDate?.toISOString().split('T')[0] || null,
            status: m.status
        }))

        // Format package balances
        const activePackages = packagePurchases.map(pp => ({
            id: pp.id,
            packageId: pp.package.id,
            packageName: pp.package.name,
            serviceId: pp.package.serviceId,
            sessionsTotal: pp.package.sessionsIncluded || 0,
            sessionsUsed: pp.usages?.length || 0,
            sessionsRemaining: (pp.package.sessionsIncluded || 0) - (pp.usages?.length || 0)
        })).filter(p => p.sessionsRemaining > 0) // Only show packages with remaining sessions

        // Aggregate all included service IDs from memberships
        const allIncludedServiceIds = activeMemberships.flatMap(m => m.includedServices)

        return NextResponse.json({
            success: true,
            data: {
                hasMembership: activeMemberships.length > 0,
                hasPackages: activePackages.length > 0,
                memberships: activeMemberships,
                packages: activePackages,
                includedServiceIds: [...new Set(allIncludedServiceIds)]
            }
        })
    } catch (error) {
        console.error('[CLIENT_MEMBERSHIP_LOOKUP]', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup membership'
        }, { status: 500 })
    }
}
