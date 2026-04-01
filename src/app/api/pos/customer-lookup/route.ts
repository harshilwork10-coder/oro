import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Quick lookup customer by phone - returns name, loyalty, recent purchases, last visit, rebooking
export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        // 4. Get last completed appointment (for "last visit" display)
        const lastAppointment = await prisma.appointment.findFirst({
            where: {
                clientId: customer.id,
                status: 'COMPLETED'
            },
            select: {
                startTime: true,
                service: { select: { name: true, duration: true } },
                employee: { select: { name: true } }
            },
            orderBy: { startTime: 'desc' }
        })

        // 5. Calculate rebooking suggestion (based on average visit interval)
        let rebookingSuggestion = null
        const completedAppointments = await prisma.appointment.findMany({
            where: { clientId: customer.id, status: 'COMPLETED' },
            select: { startTime: true },
            orderBy: { startTime: 'desc' },
            take: 5
        })
        if (completedAppointments.length >= 2) {
            const intervals: number[] = []
            for (let i = 0; i < completedAppointments.length - 1; i++) {
                const diff = new Date(completedAppointments[i].startTime).getTime() - new Date(completedAppointments[i + 1].startTime).getTime()
                intervals.push(diff)
            }
            const avgInterval = intervals.reduce((sum, d) => sum + d, 0) / intervals.length
            const avgDays = Math.round(avgInterval / (1000 * 60 * 60 * 24))
            const lastVisit = new Date(completedAppointments[0].startTime)
            const suggestedDate = new Date(lastVisit.getTime() + avgInterval)
            rebookingSuggestion = {
                avgDays,
                suggestedDate: suggestedDate.toISOString(),
                isOverdue: suggestedDate < new Date()
            }
        }

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
            })),
            lastVisit: lastAppointment ? {
                date: lastAppointment.startTime,
                service: lastAppointment.service.name,
                staff: lastAppointment.employee.name,
                daysAgo: Math.floor((Date.now() - new Date(lastAppointment.startTime).getTime()) / (1000 * 60 * 60 * 24))
            } : null,
            rebooking: rebookingSuggestion
        })

    } catch (error) {
        console.error('Error in customer quick lookup:', error)
        return NextResponse.json({ error: 'Failed to lookup customer' }, { status: 500 })
    }
}
