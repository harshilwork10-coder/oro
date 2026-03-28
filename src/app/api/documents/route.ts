import { NextResponse } from 'next/server'
import { getSignedDownloadUrl } from '@/lib/s3'

export async function GET(req: Request) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
        }

        // Security: Validate key belongs to user's franchise or is a public document
        // Keys should be formatted as: franchiseId/... or public/...
        const keyParts = key.split('/')
        if (keyParts[0] !== 'public' && keyParts[0] !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

