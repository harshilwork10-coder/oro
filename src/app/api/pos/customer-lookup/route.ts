import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Quick lookup customer by phone - returns name, loyalty, recent purchases
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')?.replace(/\D/g, '')

        if (!phone || phone.length < 7) {
            return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
        }

        // 1. Find customer by phone
        const customer = await prisma.client.findFirst({
            where: {
                franchiseId: user.franchiseId,
                phone: { contains: phone }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
            }
        })

        if (!customer) {
            return NextResponse.json({ found: false, message: 'No customer found' })
        }

        // 2. Get loyalty points if enrolled
        const loyalty = await prisma.loyaltyMember.findFirst({
            where: {
                phone: { contains: phone },
                program: { franchiseId: user.franchiseId }
            },
            select: {
                pointsBalance: true,
                lifetimePoints: true
            }
        })

        // 3. Get last 3 purchases
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                clientId: customer.id,
                status: 'COMPLETED'
            },
            select: {
                id: true,
                total: true,
                createdAt: true,
                invoiceNumber: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3
        })

        return NextResponse.json({
            found: true,
            customer: {
                id: customer.id,
                name: `${customer.firstName} ${customer.lastName}`,
                phone: customer.phone,
                email: customer.email
            },
            loyalty: loyalty ? {
                points: loyalty.pointsBalance,
                lifetimePoints: loyalty.lifetimePoints
            } : null,
            recentPurchases: recentTransactions.map(tx => ({
                id: tx.id,
                total: Number(tx.total),
                date: tx.createdAt,
                invoice: tx.invoiceNumber
            }))
        })

    } catch (error) {
        console.error('Error in customer quick lookup:', error)
        return NextResponse.json({ error: 'Failed to lookup customer' }, { status: 500 })
    }
}
