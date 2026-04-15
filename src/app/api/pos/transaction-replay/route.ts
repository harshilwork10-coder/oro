import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Transaction Replay — Step-by-step breakdown of a transaction */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const txId = searchParams.get('id')
    if (!txId) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    try {
        const tx = await prisma.transaction.findFirst({
            where: { id: txId }, include: {
                items: { include: { item: { select: { name: true, barcode: true, cost: true } } } },
                employee: { select: { name: true, email: true } }, location: { select: { name: true } }, taxLines: true
            }
        })
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

        const timeline: any[] = [{ step: 1, time: tx.createdAt, action: 'Transaction started', detail: `Employee: ${tx.employee?.name || 'Unknown'} at ${tx.location?.name}` }]
        let step = 2
        for (const item of tx.items) { timeline.push({ step: step++, time: tx.createdAt, action: `Item scanned: ${item.name}`, detail: `Qty: ${item.quantity} × $${Number(item.unitPrice).toFixed(2)} = $${Number(item.total).toFixed(2)}`, barcode: item.item?.barcode, cost: item.item?.cost ? Number(item.item.cost) : null }) }
        if (tx.discountAmount && Number(tx.discountAmount) > 0) timeline.push({ step: step++, time: tx.createdAt, action: 'Discount applied', detail: `-$${Number(tx.discountAmount).toFixed(2)}` })
        timeline.push({ step: step++, time: tx.createdAt, action: 'Tax calculated', detail: `Tax: $${Number(tx.taxAmount || 0).toFixed(2)}` })
        timeline.push({ step: step++, time: tx.createdAt, action: `Payment: ${tx.paymentMethod}`, detail: `Total: $${Number(tx.total).toFixed(2)}` })
        if (tx.status === 'VOIDED') timeline.push({ step: step++, time: tx.updatedAt, action: '⚠️ VOIDED', detail: tx.notes || 'Transaction voided' })
        if (tx.status === 'REFUNDED') timeline.push({ step: step++, time: tx.updatedAt, action: '⚠️ REFUNDED', detail: tx.notes || 'Transaction refunded' })

        return NextResponse.json({
            transaction: { id: tx.id, status: tx.status, total: Number(tx.total), paymentMethod: tx.paymentMethod, splitTenders: tx.splitTenders ? JSON.parse(tx.splitTenders as string) : null, createdAt: tx.createdAt, employee: tx.employee?.name, location: tx.location?.name },
            timeline, itemCount: tx.items.length
        })
    } catch (error: any) { console.error('[TX_REPLAY_GET]', error); return NextResponse.json({ error: 'Failed to replay transaction' }, { status: 500 }) }
}
