import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'

// Rate limiting
const creationAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const userAttempts = creationAttempts.get(userId)

    if (!userAttempts || now > userAttempts.resetAt) {
        creationAttempts.set(userId, { count: 1, resetAt: now + 60000 })
        return true
    }

    if (userAttempts.count >= 5) {
        return false
    }

    userAttempts.count++
    return true
}

// Validation
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
}

function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>"']/g, '')
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can create franchisors
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only providers can create franchisors' }, { status: 403 })
        }

        if (!checkRateLimit(session.user.id)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const body = await request.json()
        const { name, email, companyName } = body

        if (!name || !email || !companyName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        const sanitizedName = sanitizeInput(name)
        const sanitizedCompanyName = sanitizeInput(companyName)
        const sanitizedEmail = email.toLowerCase().trim()

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }

        // Generate temp password
        const tempPassword = crypto.randomBytes(32).toString('hex')
        const hashedPassword = await hash(tempPassword, 10)

        // Create user
        const user = await prisma.user.create({
            data: {
                name: sanitizedName,
                email: sanitizedEmail,
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        // Create franchisor company
        const franchisor = await prisma.franchisor.create({
            data: {
                name: sanitizedCompanyName,
                ownerId: user.id
            }
        })

        // Generate magic link
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        await prisma.magicLink.create({
            data: {
                token,
                userId: user.id,
                expiresAt
            }
        })

        const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic-link/${token}`

        // Log email
        await prisma.emailLog.create({
            data: {
                to: sanitizedEmail,
                subject: 'Welcome to Aura - Setup Your Franchise Account',
                template: 'franchisor_welcome',
                status: 'pending'
            }
        })

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email },
            franchisor: { id: franchisor.id, name: franchisor.name },
            magicLink: magicLinkUrl,
            message: 'Franchisor created successfully'
        })

    } catch (error) {
        console.error('Error creating franchisor:', error)
        return NextResponse.json(
            { error: 'Failed to create franchisor' },
            { status: 500 }
        )
    }
}
