import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST - Send a message
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { conversationId, content, senderType } = body

        if (!conversationId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: conversationId, content' },
                { status: 400 }
            )
        }

        // Get sender info if staff
        let senderId = null
        if (senderType === 'STAFF') {
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            senderId = user.id
        }

        // Create the message
        const message = await prisma.chatMessage.create({
            data: {
                conversationId,
                senderType: senderType || 'CUSTOMER',
                senderId,
                content
            }
        })

        // Update conversation metadata
        const updateData: any = {
            lastMessageAt: new Date()
        }

        // Increment unread count if customer sent it
        if (senderType === 'CUSTOMER' || !senderType) {
            updateData.unreadCount = { increment: 1 }
        }

        await prisma.chatConversation.update({
            where: { id: conversationId },
            data: updateData
        })

        return NextResponse.json(message)
    } catch (error: any) {
        console.error('[CHAT_MESSAGES_POST]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET - Get messages for a conversation (for customer widget polling)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const conversationId = searchParams.get('conversationId')
        const after = searchParams.get('after') // Timestamp for polling new messages

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
        }

        const where: any = { conversationId }

        if (after) {
            where.createdAt = { gt: new Date(after) }
        }

        const messages = await prisma.chatMessage.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return NextResponse.json(messages)
    } catch (error: any) {
        console.error('[CHAT_MESSAGES_GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

