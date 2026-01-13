import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'

// Rate limiting: Track creation attempts per user
const creationAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const userAttempts = creationAttempts.get(userId)

    if (!userAttempts || now > userAttempts.resetAt) {
        creationAttempts.set(userId, { count: 1, resetAt: now + 60000 }) // 1 minute window
        return true
    }

    if (userAttempts.count >= 5) { // Max 5 creations per minute
        return false
    }

    userAttempts.count++
    return true
}

// Input validation and sanitization
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

        // Only FRANCHISOR can create franchisees
        if (session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Forbidden - Only franchisors can create franchisees' }, { status: 403 })
        }

        // Rate limiting check
        if (!checkRateLimit(session.user.id)) {
            return NextResponse.json({ error: 'Too many requests. Please wait before creating more franchisees.' }, { status: 429 })
        }

        const body = await request.json()
        const { name, email, franchiseName } = body

        // Input validation
        if (!name || !email || !franchiseName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate email format
        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Sanitize inputs to prevent XSS
        const sanitizedName = sanitizeInput(name)
        const sanitizedFranchiseName = sanitizeInput(franchiseName)
        const sanitizedEmail = email.toLowerCase().trim()

        // Length validation
        if (sanitizedName.length > 100 || sanitizedFranchiseName.length > 100) {
            return NextResponse.json({ error: 'Input too long' }, { status: 400 })
        }

        // Get franchisor
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
        }

        // Generate temporary password (will be changed on first login)
        const tempPassword = crypto.randomBytes(32).toString('hex')
        const hashedPassword = await hash(tempPassword, 10)

        // Generate slug from name
        const slug = sanitizedFranchiseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

        // Create franchise with sanitized data
        const franchise = await prisma.franchise.create({
            data: {
                name: sanitizedFranchiseName,
                slug: slug,
                franchisorId: franchisor.id
            }
        })

        // Create franchisee user with sanitized data
        const user = await prisma.user.create({
            data: {
                name: sanitizedName,
                email: sanitizedEmail,
                password: hashedPassword,
                role: 'EMPLOYEE', // Franchisee role
                franchiseId: franchise.id
            }
        })

        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

        await prisma.magicLink.create({
            data: {
                token,
                userId: user.id,
                email: sanitizedEmail,
                expiresAt
            }
        })

        // Create magic link URL
        const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic-link/${token}`

        // Log email (actual sending will be implemented with email service)
        // Note: EmailLog model not yet defined in schema
        /*
        await prisma.emailLog.create({
            data: {
                to: email,
                subject: `Welcome to ${franchisor.name} Network!`,
                template: 'franchisee_welcome',
                status: 'pending'
            }
        })
        */
        // Debug log removed

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            franchise: {
                id: franchise.id,
                name: franchise.name
            },
            magicLink: magicLinkUrl,
            message: 'Franchisee created successfully. Magic link email will be sent.'
        })
    } catch (error) {
        console.error('Error creating franchisee:', error)
        return NextResponse.json(
            { error: 'Failed to create franchisee' },
            { status: 500 }
        )
    }
}

