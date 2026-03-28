import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const locations = await prisma.location.findMany({
            select: { id: true, name: true }
        })
        return NextResponse.json({ locations })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

