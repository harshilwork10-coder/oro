import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Layaway — Create, view, and manage layaway transactions
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { items, customerName, customerPhone, depositAmount, dueDate, notes } = await req.json()
        if (!items?.length) return NextResponse.json({ error: 'Items required' }, { status: 400 })
        if (!depositAmount || depositAmount <= 0) return NextResponse.json({ error: 'Deposit amount required' }, { status: 400 })

        const totalPrice = items.reduce((s: number, i: any) => s + (i.price * (i.quantity || 1)), 0)
        const balance = totalPrice - depositAmount

        const layaway = await prisma.transaction.create({
            data: {
                locationId: user.locationId, employeeId: user.id, type: 'LAYAWAY', status: 'LAYAWAY_ACTIVE',
                subtotal: totalPrice, total: totalPrice, paymentMethod: 'LAYAWAY',
                notes: JSON.stringify({ customerName, customerPhone, depositAmount, balance, dueDate, notes, payments: [{ date: new Date(), amount: depositAmount, method: 'CASH' }] }),
                items: { create: items.map((item: any) => ({ itemId: item.id, name: item.name, quantity: item.quantity || 1, unitPrice: item.price, total: item.price * (item.quantity || 1) })) }
            }, include: { items: true }
        })

        await logActivity({ userId: user.id, userEmail: user.email, userRole: user.role, franchiseId: user.franchiseId, action: 'LAYAWAY_CREATED', entityType: 'Layaway', entityId: layaway.id, details: { totalPrice, depositAmount, balance, customerName } })
        return NextResponse.json({ layaway })
    } catch (error: any) { console.error('[LAYAWAY_POST]', error); return NextResponse.json({ error: 'Failed to create layaway' }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.locationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const layaways = await prisma.transaction.findMany({ where: { locationId: user.locationId, type: 'LAYAWAY', status: 'LAYAWAY_ACTIVE' }, include: { items: true, employee: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
        return NextResponse.json({ layaways })
    } catch (error: any) { console.error('[LAYAWAY_GET]', error); return NextResponse.json({ error: 'Failed to fetch layaways' }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const { id, action, paymentAmount, paymentMethod } = await req.json()
        if (!id) return NextResponse.json({ error: 'Layaway ID required' }, { status: 400 })
        const layaway = await prisma.transaction.findFirst({ where: { id, type: 'LAYAWAY' } })
        if (!layaway) return NextResponse.json({ error: 'Layaway not found' }, { status: 404 })
        const data = JSON.parse(layaway.notes || '{}')

        if (action === 'PAYMENT') {
            data.payments = data.payments || []
            data.payments.push({ date: new Date(), amount: paymentAmount, method: paymentMethod || 'CASH' })
            const totalPaid = data.payments.reduce((s: number, p: any) => s + p.amount, 0)
            data.balance = Number(layaway.total) - totalPaid
            await prisma.transaction.update({ where: { id }, data: { notes: JSON.stringify(data), status: data.balance <= 0 ? 'LAYAWAY_COMPLETE' : 'LAYAWAY_ACTIVE' } })
        } else if (action === 'CANCEL') {
            await prisma.transaction.update({ where: { id }, data: { status: 'LAYAWAY_CANCELLED', notes: JSON.stringify(data) } })
        }

        await logActivity({ userId: user.id, userEmail: user.email, userRole: user.role, franchiseId: user.franchiseId, action: action === 'CANCEL' ? 'LAYAWAY_CANCELLED' : 'LAYAWAY_PAYMENT', entityType: 'Layaway', entityId: id, details: { action, paymentAmount, balance: data.balance } })
        return NextResponse.json({ updated: true, balance: data.balance })
    } catch (error: any) { console.error('[LAYAWAY_PUT]', error); return NextResponse.json({ error: 'Failed to update layaway' }, { status: 500 }) }
}
