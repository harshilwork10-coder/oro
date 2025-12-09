import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get a single conversation with messages
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Security: Require authentication
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const conversation = await prisma.chatConversation.findUnique({
            where: { id: params.id },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                franchise: {
                    select: { id: true }
                }
            }
        })

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // Security: Verify conversation belongs to user's franchise
        if (conversation.franchise?.id !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        return NextResponse.json(conversation)
    } catch (error: any) {
        console.error('[CHAT_CONVERSATION_GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH - Update conversation (status, assignment)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { status, assignedToId, markAsRead } = body

        const updateData: any = {}

        if (status) updateData.status = status
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId
        if (markAsRead) updateData.unreadCount = 0

        const conversation = await prisma.chatConversation.update({
            where: { id: params.id },
            data: updateData,
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        // Mark all messages as read if requested
        if (markAsRead) {
            await prisma.chatMessage.updateMany({
                where: {
                    conversationId: params.id,
                    senderType: 'CUSTOMER',
                    isRead: false
                },
                data: { isRead: true }
            })
        }

        return NextResponse.json(conversation)
    } catch (error: any) {
        console.error('[CHAT_CONVERSATION_PATCH]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
