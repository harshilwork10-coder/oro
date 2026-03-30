import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - List conversations (for staff dashboard)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // PROVIDER role doesn't have franchiseId - return empty for now
        if (!user.franchiseId || user.franchiseId === '__SYSTEM__' || user.role === 'PROVIDER') {
            return NextResponse.json([])
        }

        const conversations = await prisma.chatConversation.findMany({
            where: {
                franchiseId: user.franchiseId
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                assignedTo: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { lastMessageAt: 'desc' }
            ]
        })

        return NextResponse.json(conversations)
    } catch (error: any) {
        console.error('[CHAT_CONVERSATIONS_GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Start a new conversation (from customer widget)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { franchiseId, customerName, customerEmail, customerPhone, message } = body

        if (!franchiseId || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: franchiseId, message' },
                { status: 400 }
            )
        }

        const conversation = await prisma.chatConversation.create({
            data: {
                franchiseId,
                customerName: customerName || 'Guest',
                customerEmail,
                customerPhone,
                lastMessageAt: new Date(),
                unreadCount: 1,
                messages: {
                    create: {
                        senderType: 'CUSTOMER',
                        content: message
                    }
                }
            },
            include: {
                messages: true
            }
        })

        return NextResponse.json(conversation)
    } catch (error: any) {
        console.error('[CHAT_CONVERSATIONS_POST]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
