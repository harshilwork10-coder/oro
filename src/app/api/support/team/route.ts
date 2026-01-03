import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET - List support team members
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Get all users with SUPPORT_STAFF role for this franchise
        const teamMembers = await prisma.user.findMany({
            where: {
                franchiseId: user.franchiseId,
                role: 'SUPPORT_STAFF'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(teamMembers.map((m: typeof teamMembers[0]) => ({
            ...m,
            canAccessSupport: true
        })))
    } catch (error: any) {
        console.error('[SUPPORT_TEAM_GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Add a new support team member
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const body = await request.json()
        const { name, email, phone, password } = body

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({
            where: { email }
        })

        if (existing) {
            return NextResponse.json(
                { error: 'A user with this email already exists' },
                { status: 400 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create support staff user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'SUPPORT_STAFF',
                franchiseId: user.franchiseId
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        return NextResponse.json({
            ...newUser,
            canAccessSupport: true
        })
    } catch (error: any) {
        console.error('[SUPPORT_TEAM_POST]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

