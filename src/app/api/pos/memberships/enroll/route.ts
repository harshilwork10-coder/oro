/**
 * Client Membership Enrollment API
 * POST /api/pos/memberships/enroll
 * 
 * Enrolls a client into a membership plan from the POS.
 * Creates a ClientMembership record with ACTIVE status.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const body = await req.json()
        const { clientId, planId } = body

        if (!clientId || !planId) {
            return NextResponse.json({ error: 'clientId and planId are required' }, { status: 400 })
        }

        // Verify plan belongs to this franchise
        const plan = await prisma.membershipPlan.findFirst({
            where: { id: planId, franchiseId }
        })
        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
        }

        // Verify client exists
        const client = await prisma.client.findUnique({ where: { id: clientId } })
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Check if client already has an active membership for this plan
        const existing = await prisma.clientMembership.findFirst({
            where: { clientId, planId, status: 'ACTIVE' }
        })
        if (existing) {
            return NextResponse.json({ error: 'Client already has an active membership for this plan' }, { status: 409 })
        }

        // Calculate next billing date
        const now = new Date()
        const nextBilling = new Date(now)
        if (plan.billingInterval === 'WEEKLY') {
            nextBilling.setDate(nextBilling.getDate() + 7)
        } else if (plan.billingInterval === 'YEARLY') {
            nextBilling.setFullYear(nextBilling.getFullYear() + 1)
        } else {
            // Default MONTHLY
            nextBilling.setMonth(nextBilling.getMonth() + 1)
        }

        const membership = await prisma.clientMembership.create({
            data: {
                clientId,
                planId,
                status: 'ACTIVE',
                startDate: now,
                nextBillingDate: nextBilling
            },
            include: {
                plan: { select: { name: true, price: true, billingInterval: true } }
            }
        })

        return NextResponse.json({
            success: true,
            membership: {
                id: membership.id,
                planName: membership.plan.name,
                monthlyPrice: Number(membership.plan.price),
                billingCycle: membership.plan.billingInterval || 'MONTHLY',
                startDate: membership.startDate.toISOString().split('T')[0],
                nextBillingDate: membership.nextBillingDate?.toISOString().split('T')[0] || null,
                status: membership.status,
                clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim()
            }
        })
    } catch (error) {
        console.error('[MEMBERSHIP_ENROLL_POST]', error)
        return NextResponse.json({ error: 'Failed to enroll client' }, { status: 500 })
    }
})
