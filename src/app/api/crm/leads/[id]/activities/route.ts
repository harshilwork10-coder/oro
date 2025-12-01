import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Fetch activities
        const activities = await prisma.activity.findMany({
            where: {
                leadId: id,
                lead: { franchisorId: franchisor.id }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(activities)
    } catch (error) {
        console.error('Error fetching activities:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Verify lead ownership
        const lead = await prisma.lead.findFirst({
            where: { id, franchisorId: franchisor.id }
        })

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        const body = await req.json()
        const { type, subject, notes, duration, outcome } = body

        // Create activity
        const activity = await prisma.activity.create({
            data: {
                leadId: id,
                type,
                subject,
                notes,
                duration: duration ? parseInt(duration) : null,
                outcome,
                createdBy: session.user.id
            }
        })

        // Update lead stats based on activity type
        const updates: any = { lastActivityAt: new Date() }

        if (type === 'CALL') {
            updates.callCount = { increment: 1 }
        } else if (type === 'MEETING') {
            updates.meetingCount = { increment: 1 }
        }

        await prisma.lead.update({
            where: { id },
            data: updates
        })

        return NextResponse.json(activity, { status: 201 })
    } catch (error) {
        console.error('Error creating activity:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
