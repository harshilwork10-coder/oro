import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get available time slots
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get('locationId')
        const date = searchParams.get('date')
        const serviceId = searchParams.get('serviceId')
        const staffId = searchParams.get('staffId')

        if (!locationId || !date) {
            return NextResponse.json({ error: 'Location and date required' }, { status: 400 })
        }

        // Get service duration
        let duration = 30 // default
        if (serviceId) {
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                select: { duration: true }
            })
            if (service) duration = service.duration
        }

        // Get existing appointments for that date
        const dateStart = new Date(date)
        dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date)
        dateEnd.setHours(23, 59, 59, 999)

        const appointments = await prisma.appointment.findMany({
            where: {
                locationId,
                startTime: { gte: dateStart, lte: dateEnd },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                ...(staffId ? { employeeId: staffId } : {})
            },
            select: {
                startTime: true,
                endTime: true,
                employeeId: true
            }
        })

        // Generate available slots (9 AM - 6 PM)
        const slots: { time: string; available: boolean }[] = []
        const startHour = 9
        const endHour = 18

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const slotTime = new Date(date)
                slotTime.setHours(hour, minute, 0, 0)

                // Check if slot is in the past
                if (slotTime < new Date()) {
                    continue
                }

                // Check if slot conflicts with existing appointments
                const slotEnd = new Date(slotTime.getTime() + duration * 60000)
                const isConflict = appointments.some(apt => {
                    const aptStart = new Date(apt.startTime)
                    const aptEnd = new Date(apt.endTime)
                    return (slotTime < aptEnd && slotEnd > aptStart)
                })

                slots.push({
                    time: slotTime.toISOString(),
                    available: !isConflict
                })
            }
        }

        return NextResponse.json({ slots, duration })
    } catch (error) {
        console.error('Error fetching availability:', error)
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }
}

