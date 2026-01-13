import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/owner/working-barbers - Get barbers currently on shift with their stats
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const franchiseId = session.user.franchiseId

        // Get today's date range
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        // Get all employees with active shifts
        const employees = await prisma.user.findMany({
            where: {
                franchiseId,
                role: 'EMPLOYEE'
            },
            select: {
                id: true,
                name: true
            }
        })

        // Get active shifts (cash drawer sessions that are OPEN)
        const activeShifts = await prisma.cashDrawerSession.findMany({
            where: {
                employee: {
                    franchiseId: franchiseId
                },
                status: 'OPEN',
                createdAt: {
                    gte: startOfDay
                }
            },
            select: {
                employeeId: true,
                startTime: true
            }
        })

        const activeEmployeeIds = new Set(activeShifts.map(s => s.employeeId))
        const shiftStartTimes: Record<string, Date> = {}
        activeShifts.forEach(s => {
            shiftStartTimes[s.employeeId] = s.startTime
        })

        // Get today's transactions with line items to calculate sales per barber
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: {
                tip: true,
                paymentMethod: true,
                lineItems: {
                    select: {
                        staffId: true,
                        type: true,
                        total: true
                    }
                }
            }
        })

        // Calculate sales and tips per barber
        const barberStats: Record<string, { sales: number, tips: number }> = {}

        for (const tx of transactions) {
            for (const item of tx.lineItems) {
                if (item.staffId && item.type === 'SERVICE') {
                    if (!barberStats[item.staffId]) {
                        barberStats[item.staffId] = { sales: 0, tips: 0 }
                    }
                    barberStats[item.staffId].sales += Number(item.total || 0)
                }
            }

            // Assign tip to first service barber
            const tipAmount = Number(tx.tip || 0)
            if (tipAmount > 0) {
                const serviceItem = tx.lineItems.find(item => item.staffId && item.type === 'SERVICE')
                if (serviceItem?.staffId) {
                    if (!barberStats[serviceItem.staffId]) {
                        barberStats[serviceItem.staffId] = { sales: 0, tips: 0 }
                    }
                    barberStats[serviceItem.staffId].tips += tipAmount
                }
            }
        }

        // Build response
        const barbers = employees.map((emp, index) => {
            const isOnShift = activeEmployeeIds.has(emp.id)
            const clockIn = shiftStartTimes[emp.id]
            const stats = barberStats[emp.id] || { sales: 0, tips: 0 }

            return {
                id: emp.id,
                name: emp.name || 'Unknown',
                chair: index + 1, // Simple chair assignment
                status: isOnShift ? 'on-shift' : 'off',
                clockIn: clockIn ? clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
                salesToday: stats.sales,
                tipsToday: stats.tips,
                currentClient: undefined, // TODO: Track from appointments
                queueCount: 0 // TODO: Track from waitlist
            }
        })

        // Sort: on-shift first, then by sales
        barbers.sort((a, b) => {
            if (a.status === 'on-shift' && b.status !== 'on-shift') return -1
            if (a.status !== 'on-shift' && b.status === 'on-shift') return 1
            return b.salesToday - a.salesToday
        })

        return NextResponse.json({
            barbers,
            onFloorCount: barbers.filter(b => b.status === 'on-shift').length
        })

    } catch (error) {
        console.error('[OWNER_WORKING_BARBERS] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch barbers' }, { status: 500 })
    }
}
