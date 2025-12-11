import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

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
        const { name, email, phone, companyName, supportFee, type, businessType, billingMethod, enableCommission } = body

        if (!name || !email || !companyName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!validateEmail(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Validate businessType
        if (businessType && !['BRAND_FRANCHISOR', 'MULTI_LOCATION_OWNER'].includes(businessType)) {
            return NextResponse.json({ error: 'Invalid business type' }, { status: 400 })
        }

        const sanitizedName = sanitizeInput(name)
        const sanitizedCompanyName = sanitizeInput(companyName)
        const sanitizedEmail = email.toLowerCase().trim()
        const sanitizedPhone = phone ? sanitizeInput(phone) : null

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

        // Use businessType from request, fall back to deriving from type if not provided
        const finalBusinessType = businessType || (type === 'BRAND' ? 'BRAND_FRANCHISOR' : 'MULTI_LOCATION_OWNER')

        // Create franchisor company
        const franchisor = await prisma.franchisor.create({
            data: {
                name: sanitizedCompanyName,
                ownerId: user.id,
                businessType: finalBusinessType,
                phone: sanitizedPhone,
            }
        })

        // For MULTI_LOCATION_OWNER, create default franchise and location
        if (finalBusinessType === 'MULTI_LOCATION_OWNER') {
            // Create a slug from company name
            const baseSlug = sanitizedCompanyName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            const franchise = await prisma.franchise.create({
                data: {
                    name: sanitizedCompanyName,
                    slug: baseSlug,
                    franchisorId: franchisor.id,
                    approvalStatus: 'PENDING'
                }
            })

            // Create the default location (first store)
            await prisma.location.create({
                data: {
                    name: sanitizedCompanyName,
                    slug: `${baseSlug}-main`,
                    franchiseId: franchise.id
                }
            })
        }

        // Auto-license generation removed - stations are added by franchisor post-signup

        // Generate magic link
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        await prisma.magicLink.create({
            data: {
                token,
                userId: user.id,
                email: sanitizedEmail,
                expiresAt
            }
        })

        const magicLinkUrl = `${process.env.NEXTAUTH_URL}/auth/magic-link/${token}`

        // Send Email
        await sendEmail({
            to: sanitizedEmail,
            subject: 'Welcome to Oronex - Setup Your Franchise Account',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to Oronex!</h1>
                    <p>You have been invited to join Oronex as a ${finalBusinessType === 'BRAND_FRANCHISOR' ? 'Franchise Brand Owner' : 'Multi-Location Owner'}.</p>
                    <p><strong>Company:</strong> ${sanitizedCompanyName}</p>
                    <br/>
                    <p>Click the link below to accept the terms and set up your account:</p>
                    <a href="${magicLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Setup Account</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">This link expires in 24 hours.</p>
                </div>
            `
        })

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email },
            franchisor: { id: franchisor.id, name: franchisor.name },
            magicLink: magicLinkUrl, // Keep returning for dev/testing convenience
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
