import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Split Tender — Multiple payment methods on one transaction
 * POST /api/pos/split-tender
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { transactionId, tenders } = body as {
            transactionId: string
            tenders: { method: string; amount: number; reference?: string }[]
        }

        if (!transactionId || !tenders?.length) {
            return NextResponse.json({ error: 'transactionId and tenders required' }, { status: 400 })
        }

        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, locationId: user.locationId || undefined }
        })
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

        const tenderTotal = tenders.reduce((s, t) => s + t.amount, 0)
        const txTotal = Number(tx.total || 0)

        if (Math.abs(tenderTotal - txTotal) > 0.01) {
            return NextResponse.json({
                error: `Tender total ($${tenderTotal.toFixed(2)}) doesn't match transaction total ($${txTotal.toFixed(2)})`
            }, { status: 400 })
        }

        const tenderData = tenders.map(t => ({
            method: t.method.toUpperCase(),
            amount: Math.round(t.amount * 100) / 100,
            reference: t.reference || null
        }))

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                paymentMethod: 'SPLIT',
                splitTenders: JSON.stringify(tenderData),
                status: 'COMPLETED'
            }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'SPLIT_TENDER_PAYMENT', entityType: 'Transaction', entityId: transactionId,
            details: { tenders: tenderData, total: txTotal }
        })

        return NextResponse.json({ transaction: updated, tenders: tenderData })
    } catch (error: any) {
        console.error('[SPLIT_TENDER_POST]', error)
        return NextResponse.json({ error: 'Failed to process split tender' }, { status: 500 })
    }
}
