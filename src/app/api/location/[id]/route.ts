import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const location = await prisma.location.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                googlePlaceId: true,
                paxTerminalIP: true,
                paxTerminalPort: true,
                processorMID: true,
                franchise: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error: any) {
        console.error('[LOCATION_GET]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
