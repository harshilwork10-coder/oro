import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Submit a tobacco scan submission for processing
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Mark submission as submitted
        const { searchParams } = new URL(request.url)
        const submissionId = searchParams.get('id')

        // TODO: Update submission status via tobacco scan model
        console.log('[TOBACCO_SCAN_SUBMIT]', { submissionId })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[TOBACCO_SCAN_SUBMIT]', error)
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }
}
