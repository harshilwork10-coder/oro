import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { id } = params
        const body = await req.json()
        const { newSupportFee } = body // Optional: admin can set new price

        // Get current account
        const current = await prisma.franchisor.findUnique({
            where: { id }
        })

        if (!current) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        if (current.type === 'BRAND') {
            return NextResponse.json({ error: 'Already a Brand account' }, { status: 400 })
        }

        // Upgrade to Brand
        const upgraded = await prisma.franchisor.update({
            where: { id },
            data: {
                type: 'BRAND',
                baseRate: 499.00,
                supportFee: newSupportFee || 499.00 // Use provided fee or default to 499
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Account upgraded to Brand successfully',
            franchisor: upgraded
        })
    } catch (error) {
        console.error('Error upgrading account:', error)
        return NextResponse.json({ error: 'Failed to upgrade account' }, { status: 500 })
    }
}
