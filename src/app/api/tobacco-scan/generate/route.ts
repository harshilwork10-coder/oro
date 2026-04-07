import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

/**
 * POST /api/tobacco-scan/generate
 *
 * Legacy endpoint — now redirects to POST /api/tobacco-scan/export
 * which uses the new TobaccoScanExportBatch system.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { manufacturer } = await req.json()

        if (!manufacturer || !['ALTRIA', 'RJR', 'ITG'].includes(manufacturer)) {
            return NextResponse.json({ error: 'Invalid manufacturer' }, { status: 400 })
        }

        // Calculate current week range
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Redirect to the new export system
        return NextResponse.json({
            message: 'This endpoint is deprecated. Use POST /api/tobacco-scan/export instead.',
            redirect: '/api/tobacco-scan/export',
            body: {
                manufacturer,
                weekStart: startOfWeek.toISOString(),
                weekEnd: endOfWeek.toISOString(),
            },
        }, { status: 301 })
    } catch (error) {
        console.error('[TOBACCO_GENERATE]', error)
        return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
    }
}
