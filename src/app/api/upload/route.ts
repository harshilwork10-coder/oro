import { NextRequest, NextResponse } from 'next/server'
import { uploadToS3 } from '@/lib/s3'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Route segment config - Allow larger body size for file uploads
export const config = {
    api: {
        bodyParser: false, // Disable built-in body parser
        responseLimit: false,
    },
}

// Increase body size limit for Next.js App Router
export const maxDuration = 60 // 60 seconds timeout for large files

// File upload limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (increased from 5MB)
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']

export async function POST(request: NextRequest) {
    try {
        // Security: Require authentication
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const franchisorId = formData.get('franchisorId') as string
        const documentType = formData.get('documentType') as string // 'dl', 'voidedCheck', etc.

        // Validation
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!franchisorId) {
            return NextResponse.json({ error: 'Franchisor ID required' }, { status: 400 })
        }

        // Security: Verify user owns this franchisor or is PROVIDER
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: { ownerId: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        if (franchisor.ownerId !== user.id && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
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
            franchisorId,
            file.type
        )

        console.log(`✅ File uploaded successfully to S3: ${s3Key}`)

        return NextResponse.json({
            success: true,
            s3Key,
            fileName: file.name,
            documentType
        })

    } catch (error: any) {
        console.error('❌ Error uploading file to S3:')
        console.error('Error name:', error?.name)
        console.error('Error message:', error?.message)
        console.error('Error code:', error?.Code || error?.code)
        console.error('AWS fault:', error?.$fault)
        console.error('Full error:', error)

        return NextResponse.json(
            {
                error: 'Failed to upload file to S3',
                details: error?.message || 'Unknown AWS error',
                code: error?.Code || error?.code || 'UNKNOWN'
            },
            { status: 500 }
        )
    }
}

