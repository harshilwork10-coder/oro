import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** QR Receipt — Generate QR code data for digital receipt */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const txId = searchParams.get('id')
    if (!txId) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    try {
        const tx = await prisma.transaction.findFirst({ where: { id: txId }, include: { items: { select: { name: true, quantity: true, unitPrice: true, total: true } }, location: { select: { name: true, address: true } } } })
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.oro9.com'
        const receiptUrl = `${baseUrl}/receipt/${txId}`
        return NextResponse.json({ receiptUrl, qrData: receiptUrl, transaction: { id: tx.id, date: tx.createdAt, storeName: tx.location?.name, storeAddress: tx.location?.address, items: tx.items, subtotal: Number(tx.subtotal), tax: Number(tx.taxAmount || 0), total: Number(tx.total), paymentMethod: tx.paymentMethod } })
    } catch (error: any) { console.error('[QR_RECEIPT_GET]', error); return NextResponse.json({ error: 'Failed to generate QR receipt' }, { status: 500 }) }
}
