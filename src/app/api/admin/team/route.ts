import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'

// GET: List all Provider Team Members
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const team = await prisma.user.findMany({
            where: { role: 'PROVIDER' },
            select: { id: true, name: true, email: true, image: true, createdAt: true },
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
    const user = await getAuthUser(req)
    if (!user || user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const { name, email } = await req.json()
        if (!name || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 })
        }

        const tempPassword = crypto.randomBytes(16).toString('hex')
        const hashedPassword = await hash(tempPassword, 10)

        const newUser = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'PROVIDER' },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        })

        return NextResponse.json({ success: true, user: newUser })
    } catch (error) {
        console.error('Error creating team member:', error)
        return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
    }
}
