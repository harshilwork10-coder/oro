import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const locationId = user.locationId
        const { searchParams } = new URL(req.url)
        
        let dateFrom = searchParams.get('dateFrom')
        let dateTo = searchParams.get('dateTo')

        let query: any = {
            cashDrawerSession: {
                locationId
            }
        }

        if (dateFrom && dateTo) {
            query.createdAt = {
                gte: new Date(`${dateFrom} 00:00:00`),
                lte: new Date(`${dateTo} 23:59:59`)
            }
        }

        const activity = await prisma.drawerActivity.findMany({
            where: query,
            include: {
                cashDrawerSession: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(activity)
    } catch (error) {
        console.error('[DRAWER_ACTIVITY_GET_ERROR]', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
