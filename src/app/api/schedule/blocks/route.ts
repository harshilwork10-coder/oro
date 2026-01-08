import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Get time blocks for an employee
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId') || user.id
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const where: any = { userId }

        if (startDate && endDate) {
            where.OR = [
                {
                    startTime: { gte: new Date(startDate), lte: new Date(endDate) }
                },
                {
                    // Include recurring blocks that might apply
                    isRecurring: true
                }
            ]
        }

        const timeBlocks = await prisma.timeBlock.findMany({
            where,
            orderBy: { startTime: 'asc' }
        })

        return NextResponse.json({ timeBlocks })
    } catch (error) {
        console.error('Error fetching time blocks:', error)
        return NextResponse.json({ error: 'Failed to fetch time blocks' }, { status: 500 })
    }
}

// POST - Create a new time block
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { title, startTime, endTime, isRecurring, recurringDays, recurringUntil, locationId } = body

        if (!startTime || !endTime) {
            return NextResponse.json({ error: 'Start and end time required' }, { status: 400 })
        }

        // Employees can only block their own time
        // Managers/Owners can block anyone's time
        const userId = ['MANAGER', 'OWNER', 'PROVIDER'].includes(user.role) && body.userId
            ? body.userId
            : user.id

        const timeBlock = await prisma.timeBlock.create({
            data: {
                userId,
                locationId,
                title: title || 'Blocked',
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                isRecurring: isRecurring || false,
                recurringDays: recurringDays ? JSON.stringify(recurringDays) : null,
                recurringUntil: recurringUntil ? new Date(recurringUntil) : null
            }
        })

        return NextResponse.json({ timeBlock }, { status: 201 })
    } catch (error) {
        console.error('Error creating time block:', error)
        return NextResponse.json({ error: 'Failed to create time block' }, { status: 500 })
    }
}

// DELETE - Remove a time block
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Block ID required' }, { status: 400 })
        }

        // Check ownership or manager permission
        const block = await prisma.timeBlock.findUnique({ where: { id } })

        if (!block) {
            return NextResponse.json({ error: 'Time block not found' }, { status: 404 })
        }

        if (block.userId !== user.id && !['MANAGER', 'OWNER', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Not authorized to delete this block' }, { status: 403 })
        }

        await prisma.timeBlock.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting time block:', error)
        return NextResponse.json({ error: 'Failed to delete time block' }, { status: 500 })
    }
}
