/**
 * Client Photos API
 * GET /api/pos/client-photos
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    const { franchiseId } = ctx
    try {
        const photos = await prisma.clientPhoto.findMany({
            where: { client: { franchiseId } },
            orderBy: { createdAt: 'desc' },
            take: 100
        })
        // Batch-fetch client names
        const clientIds = [...new Set(photos.map(p => p.clientId))]
        const clients = clientIds.length ? await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true }
        }) : []
        const cMap = Object.fromEntries(clients.map(c => [c.id, `${c.firstName || ''} ${c.lastName || ''}`.trim()]))
        // Batch-fetch taker names
        const takerIds = [...new Set(photos.map(p => p.takenBy).filter(Boolean) as string[])]
        const takers = takerIds.length ? await prisma.user.findMany({
            where: { id: { in: takerIds } },
            select: { id: true, name: true }
        }) : []
        const uMap = Object.fromEntries(takers.map(u => [u.id, u.name || 'Unknown']))

        return NextResponse.json({
            success: true,
            data: photos.map(p => ({
                id: p.id,
                clientName: cMap[p.clientId] || 'Unknown',
                date: p.createdAt.toISOString().split('T')[0],
                type: p.photoType || 'AFTER',
                notes: p.caption || '',
                stylistName: p.takenBy ? (uMap[p.takenBy] || '') : '',
                url: p.photoUrl || ''
            }))
        })
    } catch (error) {
        console.error('[CLIENT_PHOTOS_GET]', error)
        return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 })
    }
})
