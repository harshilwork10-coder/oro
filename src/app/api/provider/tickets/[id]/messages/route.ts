import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Add message to ticket
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { message, isInternal } = body

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        // Create the message
        const ticketMessage = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                message,
                authorUserId: session.user.id,
                isInternal: isInternal || false
            },
            include: {
                authorUser: true
            }
        })

        return NextResponse.json(ticketMessage)
    } catch (error) {
        console.error('Error adding message:', error)
        return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
    }
}

// GET - Get messages for ticket
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const messages = await prisma.ticketMessage.findMany({
            where: { ticketId: params.id },
            include: { authorUser: true },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(messages)
    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}
