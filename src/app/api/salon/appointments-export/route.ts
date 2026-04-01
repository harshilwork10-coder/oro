import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// GET /api/salon/appointments-export?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const targetDate = new Date(dateParam + 'T12:00:00')
        const dayStart = startOfDay(targetDate)
        const dayEnd = endOfDay(targetDate)

        const locations = await prisma.location.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const appointments = await prisma.appointment.findMany({
            where: {
                locationId: { in: locationIds },
                startTime: { gte: dayStart, lte: dayEnd }
            },
            include: {
                client: { select: { firstName: true, lastName: true, phone: true, email: true } },
                service: { select: { name: true, price: true, duration: true } },
                employee: { select: { name: true } },
                location: { select: { name: true } }
            },
            orderBy: { startTime: 'asc' }
        })

        // Build CSV
        const header = 'Date,Time,Customer,Phone,Email,Service,Duration (min),Price,Staff,Status,Source,Location'
        const rows = appointments.map(a => {
            const date = new Date(a.startTime).toLocaleDateString('en-US')
            const time = new Date(a.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            const customer = `${a.client.firstName} ${a.client.lastName}`.replace(/,/g, '')
            const phone = a.client.phone || ''
            const email = a.client.email || ''
            const service = (a.service.name || '').replace(/,/g, '')
            const duration = a.service.duration || 0
            const price = Number(a.service.price || 0).toFixed(2)
            const staff = (a.employee.name || '').replace(/,/g, '')
            const status = a.status
            const source = a.source || 'POS'
            const location = (a.location.name || '').replace(/,/g, '')
            return `${date},${time},${customer},${phone},${email},${service},${duration},${price},${staff},${status},${source},${location}`
        })

        const csv = [header, ...rows].join('\n')
        const filename = `appointments-${dateParam}.csv`

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error) {
        console.error('[APPOINTMENTS_EXPORT] Error:', error)
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
    }
}
