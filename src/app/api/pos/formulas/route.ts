/**
 * Formula / Color Vault API
 * GET  /api/pos/formulas
 * POST /api/pos/formulas
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        // Use ClientNote with noteType=FORMULA
        const formulas = await prisma.clientNote.findMany({
            where: { client: { franchiseId }, noteType: 'FORMULA' },
            orderBy: { createdAt: 'desc' },
            take: 200
        })
        // Batch-fetch client names
        const clientIds = [...new Set(formulas.map(f => f.clientId))]
        const clients = clientIds.length ? await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true }
        }) : []
        const cMap = Object.fromEntries(clients.map(c => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()]))
        // Batch-fetch creator names
        const creatorIds = [...new Set(formulas.map(f => f.createdBy).filter(Boolean) as string[])]
        const creators = creatorIds.length ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true }
        }) : []
        const uMap = Object.fromEntries(creators.map(u => [u.id, u.name || 'Unknown']))

        return NextResponse.json({
            success: true,
            data: formulas.map(f => ({
                id: f.id,
                clientName: cMap[f.clientId] || 'Unknown',
                clientId: f.clientId,
                brand: '',
                formula: f.note || '',
                developer: '',
                processingTime: '',
                date: f.createdAt.toISOString().split('T')[0],
                stylistName: f.createdBy ? (uMap[f.createdBy] || '') : '',
                version: 1
            }))
        })
    } catch (error) {
        console.error('[FORMULAS_GET]', error)
        return NextResponse.json({ error: 'Failed to load formulas' }, { status: 500 })
    }
})

export const POST = withPOSAuth(async (req: Request, _ctx: POSContext) => {
    try {
        const body = await req.json()
        await prisma.clientNote.create({
            data: {
                clientId: body.clientId,
                noteType: 'FORMULA',
                note: JSON.stringify({ formula: body.formula, developer: body.developer, processingTime: body.processingTime }),
                createdBy: body.stylistId || undefined
            }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[FORMULAS_POST]', error)
        return NextResponse.json({ error: 'Failed to save formula' }, { status: 500 })
    }
})
