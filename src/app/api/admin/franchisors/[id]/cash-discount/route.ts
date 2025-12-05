import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ONLY PROVIDER can use this endpoint
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        // ONLY PROVIDER ROLE
        if (session?.user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 403 })
        }

        const franchisorId = params.id
        const body = await req.json()

        const { cashDiscountEnabled } = body

        // Update franchisor
        const updated = await prisma.franchisor.update({
            where: { id: franchisorId },
            data: {
                cashDiscountEnabled
            },
            select: {
                id: true,
                name: true,
                cashDiscountEnabled: true
            }
        })

        return NextResponse.json({
            success: true,
            franchisor: updated,
            message: cashDiscountEnabled
                ? 'Cash discount enabled for this salon'
                : 'Cash discount disabled for this salon'
        })

    } catch (error) {
        console.error('Error updating cash discount:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
