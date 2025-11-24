import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        console.log('[MOCK_TRANSACTION] Received transaction:', body)

        // MOCK SUCCESS RESPONSE
        const mockTransaction = {
            id: 'tx_' + Math.random().toString(36).substr(2, 9),
            total: body.total,
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
            paymentMethod: body.paymentMethod,
            lineItems: body.items.map((item: any) => ({
                ...item,
                total: item.price * item.quantity
            }))
        }

        return NextResponse.json(mockTransaction)
    } catch (error) {
        console.error('[POS_TRANSACTION_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
