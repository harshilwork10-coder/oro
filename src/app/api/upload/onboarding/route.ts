import { NextRequest, NextResponse } from 'next/server'
import { uploadToS3 } from '@/lib/s3'

// File upload limits
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']

// Special upload endpoint for onboarding - doesn't require existing franchisor
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const userId = formData.get('userId') as string
        const documentType = formData.get('documentType') as string

        // Validation
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
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

        // Upload to S3 using userId as the folder (since franchisor doesn't exist yet)
        const s3Key = await uploadToS3(
            buffer,
            file.name,
            `onboarding/${userId}`, // Store in onboarding folder
            file.type
        )

        console.log(`✅ Onboarding file uploaded to S3: ${s3Key}`)

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
