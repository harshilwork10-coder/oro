import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateInvoiceNumber, getPaxInvoiceNumber } from '@/lib/invoice'

/**
 * Generate next invoice number
 * Returns both full invoice number and PAX-compatible version
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fullInvoiceNumber = await generateInvoiceNumber(session.user.franchiseId)
        const paxInvoiceNumber = getPaxInvoiceNumber(fullInvoiceNumber)

        return NextResponse.json({
            invoiceNumber: fullInvoiceNumber,
            paxInvoiceNumber: paxInvoiceNumber
        })
    } catch (error) {
        console.error('Error generating invoice number:', error)
        return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
    }
}
