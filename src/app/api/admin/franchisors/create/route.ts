import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { logActivity } from '@/lib/auditLog'
import { autoSetupBooking, generateUniqueSlug } from '@/lib/booking/autoSetup'

// Rate limiting
const creationAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const userAttempts = creationAttempts.get(userId)

    if (!userAttempts || now > userAttempts.resetAt) {
        creationAttempts.set(userId, { count: 1, resetAt: now + 60000 })
        return true
    }

    if (userAttempts.count >= 50) {
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

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Only PROVIDER can create franchisors
        if (authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden - Only providers can create franchisors' }, { status: 403 })
        }

        if (!checkRateLimit(authUser.id)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const body = await req.json()
        const { name, email, phone, companyName, storeName, supportFee, type, businessType, industryType, processingType, billingMethod, enableCommission, dealerBrandingId } = body

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

        // Validate industryType - REQUIRED, no default
        const validIndustryTypes = ['SERVICE', 'RETAIL', 'RESTAURANT']
        if (!industryType || !validIndustryTypes.includes(industryType)) {
            return NextResponse.json({ error: 'Industry type is required (SERVICE, RETAIL, or RESTAURANT)' }, { status: 400 })
        }
        const finalIndustryType = industryType

        // Validate processingType
        const validProcessingTypes = ['POS_ONLY', 'POS_AND_PROCESSING']
        const finalProcessingType = validProcessingTypes.includes(processingType) ? processingType : 'POS_AND_PROCESSING'

        const sanitizedName = sanitizeInput(name)
        const sanitizedCompanyName = sanitizeInput(companyName)
        const sanitizedStoreName = storeName ? sanitizeInput(storeName) : sanitizedCompanyName
        const sanitizedEmail = email.toLowerCase().trim()
        const sanitizedPhone = phone ? sanitizeInput(phone) : null

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail }
        })

        let user;
        let isExistingUser = false;

        if (existingUser) {
            user = existingUser;
            isExistingUser = true;
        } else {
            const tempPassword = crypto.randomBytes(32).toString('hex')
            const hashedPassword = await hash(tempPassword, 10)

            user = await prisma.user.create({
                data: {
                    name: sanitizedName,
                    email: sanitizedEmail,
                    password: hashedPassword,
                    role: 'FRANCHISOR'
                }
            })
        }

        // Use businessType from request, fall back to deriving from type if not provided
        const finalBusinessType = businessType || (type === 'BRAND' ? 'BRAND_FRANCHISOR' : 'MULTI_LOCATION_OWNER')

        // Create franchisor company (NEW business entity)
        const franchisor = await prisma.franchisor.create({
            data: {
                name: sanitizedCompanyName,
                ownerId: user.id,
                businessType: finalBusinessType,
                industryType: finalIndustryType,
                processingType: finalProcessingType,
                phone: sanitizedPhone,
                dealerBrandingId: dealerBrandingId || null,
            }
        })

        // Create FranchisorMembership to link user to this business
        await prisma.franchisorMembership.create({
            data: {
                userId: user.id,
                franchisorId: franchisor.id,
                role: 'OWNER',
                isPrimary: !isExistingUser
            }
        })

        // AUTO-CREATE BusinessConfig with industry-appropriate defaults
        // This ensures every new business has proper feature gating from day 1
        const isService = finalIndustryType === 'SERVICE'
        const isRetail = finalIndustryType === 'RETAIL'

        await prisma.businessConfig.create({
            data: {
                franchisorId: franchisor.id,
                posMode: isService ? 'SALON' : isRetail ? 'RETAIL' : 'HYBRID',
                usesCommissions: isService,
                usesInventory: isRetail,
                usesAppointments: isService,
                usesScheduling: isService,
                usesVirtualKeypad: true,
                usesLoyalty: true,
                usesGiftCards: true,
                usesMemberships: isService,
                usesReferrals: true,
                usesRoyalties: finalBusinessType === 'BRAND_FRANCHISOR',
                usesTipping: isService,
                usesDiscounts: true,
                servicesTaxableDefault: false,
                productsTaxableDefault: true,
                usesRetailProducts: isRetail || !isService,
                usesServices: isService,
                usesEmailMarketing: true,
                usesSMSMarketing: true,
                usesReviewManagement: true,
                usesMultiLocation: false,
                usesFranchising: finalBusinessType === 'BRAND_FRANCHISOR',
                usesTimeTracking: isService,
                usesPayroll: false,
                subscriptionTier: 'STARTER',
                maxLocations: 1,
                maxUsers: isService ? 10 : 5,
            }
        })

        // For MULTI_LOCATION_OWNER, create default franchise and location
        if (finalBusinessType === 'MULTI_LOCATION_OWNER') {
            const baseSlug = sanitizedCompanyName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            const franchiseSlug = await generateUniqueSlug(baseSlug, 'franchise')

            const franchise = await prisma.franchise.create({
                data: {
                    name: sanitizedCompanyName,
                    slug: franchiseSlug,
                    franchisorId: franchisor.id,
                    approvalStatus: 'PENDING'
                }
            })

            // IMPORTANT: Link the user to their franchise
            await prisma.user.update({
                where: { id: user.id },
                data: { franchiseId: franchise.id }
            })

            // Create the default location using STORE NAME (DBA), not company name
            const storeBaseSlug = sanitizedStoreName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            const locationSlug = await generateUniqueSlug(`${storeBaseSlug}-main`, 'location')

            const location = await prisma.location.create({
                data: {
                    name: sanitizedStoreName,
                    slug: locationSlug,
                    franchiseId: franchise.id
                }
            })

            // AUTO-SETUP BOOKING for SERVICE businesses
            if (finalIndustryType === 'SERVICE') {
                try {
                    await autoSetupBooking(location.id, franchise.id, sanitizedStoreName)
                } catch (err) {
                    console.error('Booking auto-setup failed (non-blocking):', err)
                }
            }
        }

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
            subject: 'Welcome to ORO 9 - Setup Your Franchise Account',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Welcome to ORO 9!</h1>
                    <p>You have been invited to join Oro as a ${finalBusinessType === 'BRAND_FRANCHISOR' ? 'Franchise Brand Owner' : 'Multi-Location Owner'}.</p>
                    <p><strong>Company:</strong> ${sanitizedCompanyName}</p>
                    <br/>
                    <p>Click the link below to accept the terms and set up your account:</p>
                    <a href="${magicLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Setup Account</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">This link expires in 24 hours.</p>
                </div>
            `
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: 'FRANCHISOR_CREATED',
            entityType: 'Franchisor',
            entityId: franchisor.id,
            details: { companyName: sanitizedCompanyName, businessType: finalBusinessType, industryType: finalIndustryType, isExistingUser, ownerEmail: sanitizedEmail }
        })

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email },
            franchisor: { id: franchisor.id, name: franchisor.name },
            magicLink: magicLinkUrl,
            isExistingUser,
            message: isExistingUser
                ? `New business "${sanitizedCompanyName}" linked to existing user ${sanitizedEmail}`
                : 'Franchisor created successfully'
        })

    } catch (error) {
        console.error('Error creating franchisor:', error)
        return NextResponse.json(
            { error: 'Failed to create franchisor' },
            { status: 500 }
        )
    }
}
