import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
})

export async function GET(request: NextRequest) {
    try {
        // Security: Require authentication
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json({ error: 'Document key required' }, { status: 400 })
        }

        // Generate a signed URL valid for 1 hour
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        })

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

        // Redirect to the signed URL
        return NextResponse.redirect(signedUrl)

    } catch (error: any) {
        console.error('Error generating signed URL:', error?.message)
        return NextResponse.json(
            { error: 'Failed to access document', details: error?.message },
            { status: 500 }
        )
    }
}

