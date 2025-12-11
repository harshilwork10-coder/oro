import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Canned responses for quick replies
const CANNED_RESPONSES = [
    {
        id: 'greeting',
        title: 'Greeting',
        content: "Hi! Thank you for reaching out to Oronex Support. I'm here to help you today. How can I assist you?"
    },
    {
        id: 'processing',
        title: 'Looking into it',
        content: "Thank you for your patience. I'm looking into this for you and will have an update shortly."
    },
    {
        id: 'more_info',
        title: 'Need more info',
        content: "To better assist you, could you please provide more details about the issue you're experiencing? For example: the steps you took, any error messages, and when this started happening."
    },
    {
        id: 'resolved',
        title: 'Issue resolved',
        content: "I've resolved the issue you reported. Please let me know if you need any further assistance or if you're still experiencing problems."
    },
    {
        id: 'escalate',
        title: 'Escalating',
        content: "I'm escalating this to our technical team for further investigation. They will review your case and get back to you as soon as possible."
    },
    {
        id: 'closing',
        title: 'Closing ticket',
        content: "If there's nothing else I can help you with, I'll close this ticket. Feel free to start a new conversation anytime if you have more questions. Have a great day!"
    }
]

// GET - Fetch all support chats for admin dashboard
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') || 'all'
        const priority = searchParams.get('priority') || 'all'
        const chatId = searchParams.get('chatId')
        const getCannedResponses = searchParams.get('cannedResponses')

        // Return canned responses if requested
        if (getCannedResponses === 'true') {
            return NextResponse.json({ cannedResponses: CANNED_RESPONSES })
        }

        // If chatId is provided, return single chat with messages
        if (chatId) {
            const chat = await prisma.supportChat.findUnique({
                where: { id: chatId },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true }
                    },
                    assignee: {
                        select: { id: true, name: true, email: true, image: true }
                    },
                    messages: {
                        orderBy: { createdAt: 'asc' }
                    }
                }
            })
            return NextResponse.json(chat)
        }

        // Build where clause based on filters
        const whereClause: any = {}
        if (status !== 'all') {
            whereClause.status = status
        }
        if (priority !== 'all') {
            whereClause.priority = priority
        }

        const chats = await prisma.supportChat.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true }
                },
                assignee: {
                    select: { id: true, name: true, email: true, image: true }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: [
                { priority: 'desc' }, // URGENT first
                { status: 'asc' },
                { updatedAt: 'desc' }
            ]
        })

        // Get counts by status
        const counts = await prisma.supportChat.groupBy({
            by: ['status'],
            _count: { id: true }
        })

        const statusCounts = {
            all: 0,
            OPEN: 0,
            WAITING_SUPPORT: 0,
            WAITING_USER: 0,
            CLOSED: 0
        }
        counts.forEach((c: { status: string; _count: { id: number } }) => {
            statusCounts[c.status as keyof typeof statusCounts] = c._count.id
            statusCounts.all += c._count.id
        })

        // Get support team members for assignment dropdown
        const supportTeam = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'FRANCHISOR' },
                    { role: 'MANAGER' },
                    { role: 'ADMIN' }
                ]
            },
            select: { id: true, name: true, email: true, image: true },
            take: 50
        })

        return NextResponse.json({
            chats,
            counts: statusCounts,
            supportTeam,
            cannedResponses: CANNED_RESPONSES
        })
    } catch (error) {
        console.error('[SUPPORT_CHAT_ADMIN_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - Send a reply as support
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { chatId, message } = await req.json()

        if (!chatId || !message?.trim()) {
            return NextResponse.json({ error: 'Chat ID and message are required' }, { status: 400 })
        }

        // Add support message
        const supportMessage = await prisma.supportMessage.create({
            data: {
                chatId,
                content: message,
                sender: 'SUPPORT',
                senderId: user.id
            }
        })

        // Update chat status and auto-assign if not assigned
        await prisma.supportChat.update({
            where: { id: chatId },
            data: {
                status: 'WAITING_USER',
                assigneeId: user.id, // Auto-assign to replying agent
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ success: true, message: supportMessage })
    } catch (error) {
        console.error('[SUPPORT_CHAT_ADMIN_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PUT - Update chat status, priority, or assignee
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { chatId, status, priority, assigneeId } = await req.json()

        if (!chatId) {
            return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
        }

        const updateData: any = { updatedAt: new Date() }

        // Validate and set status
        if (status) {
            const validStatuses = ['OPEN', 'WAITING_SUPPORT', 'WAITING_USER', 'CLOSED']
            if (!validStatuses.includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
            }
            updateData.status = status
            if (status === 'CLOSED') {
                updateData.closedAt = new Date()
            } else {
                updateData.closedAt = null
            }
        }

        // Validate and set priority
        if (priority) {
            const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
            if (!validPriorities.includes(priority)) {
                return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
            }
            updateData.priority = priority
        }

        // Set assignee (can be null to unassign)
        if (assigneeId !== undefined) {
            updateData.assigneeId = assigneeId || null
        }

        const chat = await prisma.supportChat.update({
            where: { id: chatId },
            data: updateData,
            include: {
                assignee: {
                    select: { id: true, name: true, email: true }
                }
            }
        })

        return NextResponse.json(chat)
    } catch (error) {
        console.error('[SUPPORT_CHAT_ADMIN_PUT]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
