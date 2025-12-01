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

        // Fetch tasks
        const tasks = await prisma.task.findMany({
            where: {
                leadId: id,
                lead: { franchisorId: franchisor.id }
            },
            orderBy: { dueDate: 'asc' }
        })

        return NextResponse.json(tasks)
    } catch (error) {
        console.error('Error fetching tasks:', error)
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
        const { title, description, dueDate, priority } = body

        if (!title || !dueDate) {
            return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
        }

        // Create task
        const task = await prisma.task.create({
            data: {
                leadId: id,
                title,
                description,
                dueDate: new Date(dueDate),
                priority: priority || 'MEDIUM',
                assignedTo: session.user.id,
                createdBy: session.user.id
            }
        })

        return NextResponse.json(task, { status: 201 })
    } catch (error) {
        console.error('Error creating task:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
