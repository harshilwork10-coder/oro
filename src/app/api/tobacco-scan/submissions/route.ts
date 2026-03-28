import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET /api/tobacco-scan/submissions - List all tobacco scan submissions
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const submissions = await prisma.tobaccoScanSubmission.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { weekStartDate: 'desc' },
            take: 20
        })

        return NextResponse.json({ submissions })
    } catch (error) {
        console.error('Failed to fetch tobacco submissions:', error)
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }
}

