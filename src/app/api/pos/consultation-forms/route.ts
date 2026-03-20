/**
 * Consultation Forms API
 * GET  /api/pos/consultation-forms
 * POST /api/pos/consultation-forms
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const waivers = await prisma.clientWaiver.findMany({
            where: { franchiseId },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
        // Batch-fetch client names
        const clientIds = [...new Set(waivers.map(w => w.clientId).filter(Boolean) as string[])]
        const clients = clientIds.length ? await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true, phone: true }
        }) : []
        const cMap = Object.fromEntries(clients.map(c => [c.id, c]))

        const forms = waivers.map(w => {
            const c = w.clientId ? cMap[w.clientId] : null
            return {
                id: w.id,
                clientName: c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (w.customerName || 'Unknown'),
                clientId: w.clientId,
                date: w.createdAt.toISOString().split('T')[0],
                waiverSigned: w.consentGiven ?? false,
                status: w.consentGiven ? 'COMPLETED' : 'PENDING'
            }
        })
        return NextResponse.json({ success: true, data: forms })
    } catch (error) {
        console.error('[CONSULTATION_FORMS_GET]', error)
        return NextResponse.json({ error: 'Failed to load forms' }, { status: 500 })
    }
})

export const POST = withPOSAuth(async (req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const body = await req.json()
        await prisma.clientWaiver.create({
            data: {
                franchiseId,
                clientId: body.clientId || null,
                customerName: body.clientName || 'Walk-in',
                customerEmail: body.clientEmail || 'noemail@placeholder.com',
                waiverText: body.waiverText || 'Standard salon consultation and service consent form.',
                signatureName: body.signatureName || body.clientName || 'Walk-in',
                consentGiven: body.waiverSigned ?? false
            }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[CONSULTATION_FORMS_POST]', error)
        return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
    }
})
