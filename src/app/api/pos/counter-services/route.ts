import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * Money Order / Bill Pay / Counter Services API
 * 
 * C-stores sell non-inventory services at the counter:
 *   - Western Union money orders ($1.25 fee)
 *   - Bill pay (utility payments)
 *   - Fax/Copy services
 *   - Prepaid phone cards (service fee)
 *   - Check cashing
 * 
 * These are NOT regular products — they're service fees that
 * need special handling in reports and accounting.
 */

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const franchiseId = user.franchiseId
        if (!franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Return available counter services
        const services = [
            {
                id: 'MONEY_ORDER',
                name: 'Money Order',
                icon: '💵',
                feeType: 'FLAT',
                defaultFee: 1.25,
                maxAmount: 1000.00,
                requiresAmount: true,
                requiresRecipient: true,
                taxable: false,
                category: 'Financial Services',
                description: 'Western Union / MoneyGram money order',
            },
            {
                id: 'BILL_PAY',
                name: 'Bill Payment',
                icon: '📄',
                feeType: 'FLAT',
                defaultFee: 1.50,
                maxAmount: 5000.00,
                requiresAmount: true,
                requiresRecipient: false,
                taxable: false,
                category: 'Financial Services',
                description: 'Utility bill payments',
            },
            {
                id: 'CHECK_CASHING',
                name: 'Check Cashing',
                icon: '📝',
                feeType: 'PERCENTAGE',
                defaultFee: 3.0,   // 3%
                maxAmount: 10000.00,
                requiresAmount: true,
                requiresRecipient: false,
                taxable: false,
                category: 'Financial Services',
                description: 'Check cashing service (3% fee)',
            },
            {
                id: 'FAX',
                name: 'Fax Service',
                icon: '📠',
                feeType: 'PER_PAGE',
                defaultFee: 2.00,
                maxAmount: null,
                requiresAmount: false,
                requiresRecipient: false,
                taxable: true,
                category: 'Office Services',
                description: '$2.00 per page',
            },
            {
                id: 'COPY',
                name: 'Copy/Print',
                icon: '🖨️',
                feeType: 'PER_PAGE',
                defaultFee: 0.25,
                maxAmount: null,
                requiresAmount: false,
                requiresRecipient: false,
                taxable: true,
                category: 'Office Services',
                description: '$0.25 per page',
            },
            {
                id: 'PREPAID_ACTIVATION',
                name: 'Prepaid Phone Activation',
                icon: '📱',
                feeType: 'FLAT',
                defaultFee: 0.00,  // fee built into card price
                maxAmount: null,
                requiresAmount: false,
                requiresRecipient: false,
                taxable: false,
                category: 'Telecom',
                description: 'Prepaid phone card activation',
            },
        ]

        return NextResponse.json({ services })

    } catch (error) {
        console.error('Counter Services GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { serviceId, amount, pages, recipient, notes } = body

        if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })

        // Calculate fee based on service type
        const serviceMap: Record<string, { feeType: string; fee: number; name: string; taxable: boolean; max: number | null }> = {
            MONEY_ORDER: { feeType: 'FLAT', fee: 1.25, name: 'Money Order', taxable: false, max: 1000 },
            BILL_PAY: { feeType: 'FLAT', fee: 1.50, name: 'Bill Payment', taxable: false, max: 5000 },
            CHECK_CASHING: { feeType: 'PERCENTAGE', fee: 3.0, name: 'Check Cashing', taxable: false, max: 10000 },
            FAX: { feeType: 'PER_PAGE', fee: 2.00, name: 'Fax Service', taxable: true, max: null },
            COPY: { feeType: 'PER_PAGE', fee: 0.25, name: 'Copy/Print', taxable: true, max: null },
            PREPAID_ACTIVATION: { feeType: 'FLAT', fee: 0.00, name: 'Prepaid Activation', taxable: false, max: null },
        }

        const service = serviceMap[serviceId]
        if (!service) return NextResponse.json({ error: 'Unknown service' }, { status: 400 })

        if (service.max && amount && amount > service.max) {
            return NextResponse.json({ error: `Amount exceeds max $${service.max}` }, { status: 400 })
        }

        let customerCharge = 0
        let fee = 0

        if (service.feeType === 'FLAT') {
            fee = service.fee
            customerCharge = (amount || 0) + fee
        } else if (service.feeType === 'PERCENTAGE') {
            fee = Math.round((amount || 0) * (service.fee / 100) * 100) / 100
            customerCharge = fee  // customer pays the fee, gets face value minus fee
        } else if (service.feeType === 'PER_PAGE') {
            fee = service.fee * (pages || 1)
            customerCharge = fee
        }

        const lineItem = {
            id: `SVC-${Date.now().toString(36).toUpperCase()}`,
            name: service.name,
            serviceId,
            amount: amount || 0,
            fee: Math.round(fee * 100) / 100,
            customerCharge: Math.round(customerCharge * 100) / 100,
            taxable: service.taxable,
            isService: true,
            recipient: recipient || null,
            pages: pages || null,
            notes: notes || null,
            cashier: user.name || user.email,
            timestamp: new Date().toISOString(),
        }

        return NextResponse.json({
            success: true,
            item: lineItem,
        })

    } catch (error) {
        console.error('Counter Services POST error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
