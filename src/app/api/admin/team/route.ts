import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'

// Helper to check if user is allowed to manage team
async function checkPermission(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return null
    }
    // Only SUPER_ADMIN or MANAGER can manage team
    // If providerRole is null, assume SUPER_ADMIN (the owner)
    const userRole = session.user.providerRole
    if (userRole && userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER') {
        return null
    }
    return session
}

// GET: List all Provider Team Members
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const team = await prisma.user.findMany({
            where: {
                role: 'PROVIDER',
                deletedAt: null
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                providerRole: true,
                providerPermissions: true,
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
    const session = await checkPermission(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    try {
        const body = await req.json()
        const { name, email, role, permissions } = body

        if (!name || !email || !role) {
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
                role: 'PROVIDER', // Crucial: They are part of the Provider team
                providerRole: role,
                providerPermissions: JSON.stringify(permissions || {})
            }
        })

        // TODO: Send invitation email with temp password or magic link

        return NextResponse.json({ success: true, user })
    } catch (error) {
        console.error('Error creating team member:', error)
        return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
    }
}
