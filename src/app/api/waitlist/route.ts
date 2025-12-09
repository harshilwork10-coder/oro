import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWaitlistAddedSMS } from '@/lib/sms'

// GET - List waitlist entries for today
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { location: true }
        })

        if (!user?.location?.id) {
            return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
        }

        // Get today's entries
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const entries = await prisma.waitlistEntry.findMany({
            where: {
                locationId: user.location.id,
                checkedInAt: { gte: today },
                status: { in: ['WAITING', 'NOTIFIED', 'SEATED'] }
            },
            include: {
                service: { select: { name: true, duration: true } }
            },
            orderBy: [
                { status: 'asc' }, // WAITING first
                { position: 'asc' }
            ]
        })

        return NextResponse.json(entries)
    } catch (error) {
        console.error('Error fetching waitlist:', error)
        return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 })
    }
}

// POST - Add to waitlist
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                location: {
                    include: { franchise: true }
                }
            }
        })

        if (!user?.location?.id) {
            return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
        }

        const body = await request.json()
        const { customerName, customerPhone, customerEmail, partySize, serviceId, notes } = body

        if (!customerName) {
            return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
        }

        // Get next position
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const lastEntry = await prisma.waitlistEntry.findFirst({
            where: {
                locationId: user.location.id,
                checkedInAt: { gte: today }
            },
            orderBy: { position: 'desc' }
        })

        const nextPosition = (lastEntry?.position || 0) + 1

        // Calculate estimated wait based on current queue
        const waitingCount = await prisma.waitlistEntry.count({
            where: {
                locationId: user.location.id,
                status: 'WAITING',
                checkedInAt: { gte: today }
            }
        })

        // Estimate ~15 min per person
        const estimatedWait = waitingCount * 15

        const entry = await prisma.waitlistEntry.create({
            data: {
                locationId: user.location.id,
                customerName,
                customerPhone: customerPhone || null,
                customerEmail: customerEmail || null,
                partySize: partySize || 1,
                serviceId: serviceId || null,
                notes: notes || null,
                status: 'WAITING',
                position: nextPosition,
                estimatedWait
            },
            include: {
                service: { select: { name: true } }
            }
        })

        return NextResponse.json(entry)
    } catch (error) {
        console.error('Error adding to waitlist:', error)
        return NextResponse.json({ error: 'Failed to add to waitlist' }, { status: 500 })
    }
}


