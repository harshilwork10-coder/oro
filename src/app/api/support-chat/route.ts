import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch user's active chat or create new one
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Find or create an open chat for this user
        let chat = await prisma.supportChat.findFirst({
            where: {
                userId: user.id,
                status: { not: 'CLOSED' }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!chat) {
            // Create new chat session
            chat = await prisma.supportChat.create({
                data: {
                    userId: user.id,
                    status: 'OPEN'
                },
                include: {
                    messages: true
                }
            })

            // Add welcome message
            await prisma.supportMessage.create({
                data: {
                    chatId: chat.id,
                    content: "👋 Welcome to Oronex Support! How can we help you today?",
                    sender: 'SUPPORT'
                }
            })

            // Re-fetch with new message
            chat = await prisma.supportChat.findUnique({
                where: { id: chat.id },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            })
        }

        return NextResponse.json(chat)
    } catch (error) {
        console.error('[SUPPORT_CHAT_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - Send a message
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { message, chatId } = await req.json()

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        // Find or create chat
        let chat = chatId
            ? await prisma.supportChat.findUnique({ where: { id: chatId } })
            : await prisma.supportChat.findFirst({
                where: { userId: user.id, status: { not: 'CLOSED' } }
            })

        if (!chat) {
            chat = await prisma.supportChat.create({
                data: { userId: user.id, status: 'OPEN' }
            })
        }

        // Add user message
        const userMessage = await prisma.supportMessage.create({
            data: {
                chatId: chat.id,
                content: message,
                sender: 'USER',
                senderId: user.id
            }
        })

        // Update chat status
        await prisma.supportChat.update({
            where: { id: chat.id },
            data: { status: 'WAITING_SUPPORT', updatedAt: new Date() }
        })

        return NextResponse.json({ success: true, message: userMessage })
    } catch (error) {
        console.error('[SUPPORT_CHAT_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT - Close chat
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { chatId } = await req.json()

        // Security: Verify chat belongs to user (or user is support staff)
        const existingChat = await prisma.supportChat.findUnique({
            where: { id: chatId },
            select: { userId: true }
        })

        if (!existingChat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        if (existingChat.userId !== user.id && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const chat = await prisma.supportChat.update({
            where: { id: chatId },
            data: {
                status: 'CLOSED',
                closedAt: new Date()
            }
        })

        return NextResponse.json(chat)
    } catch (error) {
        console.error('[SUPPORT_CHAT_PUT]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
