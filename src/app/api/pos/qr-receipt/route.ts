'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Generate QR receipt data (customer scans QR → receipt on phone)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const { searchParams } = new URL(request.url)
        const txId = searchParams.get('id')
        if (!txId) return ApiResponse.badRequest('Transaction ID required')

        const tx = await prisma.transaction.findFirst({
            where: { id: txId },
            include: {
                items: { select: { name: true, quantity: true, unitPrice: true, total: true } },
                location: { select: { name: true, address: true } }
            }
        })

        if (!tx) return ApiResponse.notFound('Transaction not found')

        // Generate receipt URL (the QR code will encode this URL)
        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.oronex.com'
        const receiptUrl = `${baseUrl}/receipt/${txId}`

        // Return data needed to render QR code at POS
        return ApiResponse.success({
            receiptUrl,
            qrData: receiptUrl,
            transaction: {
                id: tx.id,
                date: tx.createdAt,
                storeName: tx.location?.name,
                storeAddress: tx.location?.address,
                items: tx.items,
                subtotal: Number(tx.subtotal),
                tax: Number(tx.taxAmount || 0),
                total: Number(tx.total),
                paymentMethod: tx.paymentMethod
            }
        })
    } catch (error) {
        console.error('[QR_RECEIPT_GET]', error)
        return ApiResponse.error('Failed to generate QR receipt')
    }
}
