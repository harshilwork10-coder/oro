import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Redeem a package session
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        const body = await request.json()
        const { purchaseId, appointmentId, notes } = body

        if (!purchaseId) {
            return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })
        }

        // Verify purchase exists and has sessions remaining
        const purchase = await prisma.packagePurchase.findUnique({
            where: { id: purchaseId },
            include: {
                package: { select: { franchiseId: true, service: { select: { name: true } } } }
            }
        })

        if (!purchase) {
            return NextResponse.json({ error: 'Package purchase not found' }, { status: 404 })
        }

        // Verify franchise ownership
        if (purchase.package.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (purchase.sessionsRemaining <= 0) {
            return NextResponse.json({ error: 'No sessions remaining' }, { status: 400 })
        }

        if (purchase.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Package has expired' }, { status: 400 })
        }

        // Create usage record and decrement sessions
        const [usage, updatedPurchase] = await prisma.$transaction([
            prisma.packageUsage.create({
                data: {
                    purchaseId,
                    appointmentId,
                    employeeId: user.id,
                    notes
                }
            }),
            prisma.packagePurchase.update({
                where: { id: purchaseId },
                data: {
                    sessionsUsed: { increment: 1 },
                    sessionsRemaining: { decrement: 1 }
                }
            })
        ])

        return NextResponse.json({
            success: true,
            usage,
            sessionsRemaining: updatedPurchase.sessionsRemaining,
            serviceName: purchase.package.service?.name
        })
    } catch (error) {
        console.error('Error redeeming package:', error)
        return NextResponse.json({ error: 'Failed to redeem package' }, { status: 500 })
    }
}

