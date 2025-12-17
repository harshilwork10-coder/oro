import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    // SECURITY: Only PROVIDER can list agents
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        // Get all users with role 'AGENT'
        const agents = await prisma.user.findMany({
            where: {
                role: 'AGENT'
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            }
        })

        // For now, return with 0 clients until schema is updated
        const agentsWithCount = agents.map(agent => ({
            ...agent,
            clientsCount: 0, // TODO: Will be agent.referredClients.length once schema updated
            createdAt: agent.createdAt.toISOString()
        }))

        return NextResponse.json(agentsWithCount)
    } catch (error) {
        console.error('Error fetching agents:', error)
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    // SECURITY: Only PROVIDER can create agents
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const { name, email } = await request.json()

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email }
        })

        if (existing) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
        }

        // Create agent user
        const agent = await prisma.user.create({
            data: {
                name,
                email,
                role: 'AGENT'
            }
        })

        // Create magic link for agent onboarding
        const token = Buffer.from(`${email}-${Date.now()}`).toString('base64url')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

        await prisma.magicLink.create({
            data: {
                token,
                email,
                userId: agent.id,
                expiresAt
            }
        })

        return NextResponse.json({
            success: true,
            agent,
            inviteLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/magic-link/${token}`
        })
    } catch (error) {
        console.error('Error creating agent:', error)
        return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }
}
