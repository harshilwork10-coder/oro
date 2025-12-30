import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'

// Helper to check if user is allowed to manage team
async function checkPermission() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return null
    }
    return session
}

// GET: List all Provider Team Members
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const team = await prisma.user.findMany({
            where: {
                role: 'PROVIDER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(team)
    } catch (error) {
        console.error('Error fetching team:', error)
        return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
    }
}

// POST: Create a new Team Member
export async function POST(req: NextRequest) {
    const session = await checkPermission()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const body = await req.json()
        const { name, email } = body

        if (!name || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 })
        }

        // Generate temp password
        const tempPassword = crypto.randomBytes(16).toString('hex')
        const hashedPassword = await hash(tempPassword, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'PROVIDER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        // TODO: Send invitation email with temp password or magic link

        return NextResponse.json({ success: true, user })
    } catch (error) {
        console.error('Error creating team member:', error)
        return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
    }
}

