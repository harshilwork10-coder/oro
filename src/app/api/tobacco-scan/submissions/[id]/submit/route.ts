import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST - Submit a tobacco scan submission for processing
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Mark submission as submitted
        const { searchParams } = new URL(req.url)
        const submissionId = searchParams.get('id')

        // TODO: Update submission status via tobacco scan model
        console.log('[TOBACCO_SCAN_SUBMIT]', { submissionId })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[TOBACCO_SCAN_SUBMIT]', error)
        return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
    }
}
