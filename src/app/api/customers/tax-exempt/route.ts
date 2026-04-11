'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// PUT — Set tax exempt status on a customer
export async function PUT(req: NextRequest) {
    try {
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
        }
        if (!user.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const body = await req.json()
        const { clientId, taxExempt, exemptionId, expiryDate } = body

        if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId: user.franchiseId }
        })
        if (!client) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

        const updated = await prisma.client.update({
            where: { id: clientId },
            data: {
                taxExempt: taxExempt ?? false,
                exemptCertificateNumber: exemptionId || null,
                exemptCertificateExpiry: expiryDate ? new Date(expiryDate) : null
            }
        })

        return NextResponse.json({ success: true, client: updated })
    } catch (error) {
        console.error('[TAX_EXEMPT_PUT]', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// GET — List tax exempt customers
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        const exemptClients = await prisma.client.findMany({
            where: {
                franchiseId: user.franchiseId,
                taxExempt: true
            },
            select: {
                id: true, firstName: true, lastName: true, email: true, phone: true,
                exemptCertificateNumber: true, exemptCertificateExpiry: true
            },
            orderBy: { firstName: 'asc' }
        })

        return NextResponse.json({ success: true, clients: exemptClients })
    } catch (error) {
        console.error('[TAX_EXEMPT_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}
