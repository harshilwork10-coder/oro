import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSignedDownloadUrl } from '@/lib/s3'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
        }

        // Generate a presigned URL that expires in 1 hour
        const signedUrl = await getSignedDownloadUrl(key, 3600)

        // Redirect to the signed URL to view/download the file
        return NextResponse.redirect(signedUrl)
    } catch (error) {
        console.error('Error generating signed URL:', error)
        return NextResponse.json({ error: 'Failed to generate document URL' }, { status: 500 })
    }
}
