import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadToS3 } from '@/lib/s3'
import { prisma } from '@/lib/prisma'

// Route segment config - Allow larger body size for file uploads
export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
}

// Increase timeout for large files
export const maxDuration = 60

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']

// Special upload endpoint for onboarding documents
// Supports BOTH: session auth (logged in users) AND magic-link token auth (onboarding users)
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const documentType = formData.get('documentType') as string
        const magicLinkToken = formData.get('token') as string | null
        const providedUserId = formData.get('userId') as string | null

        let userId: string | null = null

        // Try session auth first (for logged-in users)
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
            userId = session.user.id
        }

        // If no session, try magic-link token auth (for onboarding users)
        if (!userId && magicLinkToken) {
            const magicLink = await prisma.magicLink.findUnique({
                where: { token: magicLinkToken },
                select: { userId: true, expiresAt: true, completedAt: true }
            })

            if (magicLink && !magicLink.completedAt && new Date() < magicLink.expiresAt) {
                userId = magicLink.userId
            }
        }

        // SECURITY: Do NOT allow uploads without proper authentication
        // Removed insecure providedUserId fallback that allowed unauthenticated uploads

        if (!userId) {
            console.error('[SECURITY] Rejected unauthenticated upload attempt')
            return NextResponse.json({ error: 'Unauthorized - valid session or magic link required' }, { status: 401 })
        }

        // Validation
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG' }, { status: 400 })
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to S3
        const s3Key = await uploadToS3(
            buffer,
            file.name,
            `onboarding/${userId}`,
            file.type
        )

        return NextResponse.json({
            success: true,
            s3Key,
            fileName: file.name,
            documentType
        })

    } catch (error: any) {
        console.error('❌ Error uploading onboarding file:', error?.message)

        return NextResponse.json(
            {
                error: 'Failed to upload file',
                details: error?.message || 'Unknown error'
            },
            { status: 500 }
        )
    }
}


