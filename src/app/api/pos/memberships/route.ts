/**
 * Memberships & Packages API
 * GET  /api/pos/memberships
 * POST /api/pos/memberships
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const [plans, subscriptions, packages] = await Promise.all([
            prisma.membershipPlan.findMany({ where: { franchiseId }, orderBy: { name: 'asc' } }),
            prisma.clientMembership.findMany({
                where: { plan: { franchiseId } },
                include: { plan: { select: { name: true, price: true } } },
                orderBy: { startDate: 'desc' },
                take: 100
            }),
            prisma.servicePackage.findMany({
                where: { franchiseId },
                include: { purchases: { include: { usages: true } } },
                orderBy: { name: 'asc' }
            })
        ])

        // Batch-fetch client names for subscriptions
        const clientIds = [...new Set(subscriptions.map(s => s.clientId))]
        const clients = clientIds.length ? await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true }
        }) : []
        const cMap = Object.fromEntries(clients.map(c => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()]))

        return NextResponse.json({
            success: true,
            plans: plans.map(p => ({
                id: p.id, name: p.name, price: Number(p.price),
                billingCycle: p.billingInterval || 'MONTHLY',
                includedServices: p.includedServices ? p.includedServices.split(',') : [],
                memberCount: 0
            })),
            subscriptions: subscriptions.map(s => ({
                id: s.id, clientName: cMap[s.clientId] || 'Unknown',
                planName: s.plan?.name || '', nextBillingDate: s.nextBillingDate?.toISOString().split('T')[0] || '',
                usageThisPeriod: 0, status: s.status || 'ACTIVE',
                monthlyRate: s.plan?.price ? Number(s.plan.price) : 0
            })),
            packages: packages.map(p => ({
                id: p.id, name: p.name, services: [],
                totalPrice: Number(p.price),
                sessionsIncluded: p.sessionsIncluded || 0,
                sessionsUsed: p.purchases?.reduce((sum: number, pu: any) => sum + (pu.usages?.length || 0), 0) || 0,
                expirationDays: p.validityDays || 90,
                isActive: p.isActive ?? true
            }))
        })
    } catch (error) {
        console.error('[MEMBERSHIPS_GET]', error)
        return NextResponse.json({ error: 'Failed to load memberships' }, { status: 500 })
    }
})

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const body = await req.json()
        if (body.type === 'plan') {
            await prisma.membershipPlan.create({
                data: { franchiseId, name: body.name, price: body.price, billingInterval: body.billingCycle || 'MONTHLY' }
            })
        } else if (body.type === 'package') {
            await prisma.servicePackage.create({
                data: { franchiseId, name: body.name, price: body.totalPrice, sessionsIncluded: body.sessionsIncluded || 1, validityDays: body.expirationDays || 90, serviceId: body.serviceId || '' }
            })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[MEMBERSHIPS_POST]', error)
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }
})
