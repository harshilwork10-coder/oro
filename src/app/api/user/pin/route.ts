import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPin, validatePin } from '@/lib/pinUtils'
import { auditLog } from '@/lib/audit'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { pin } = await request.json()

        // Validate PIN format
        const validation = validatePin(pin)
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Hash the PIN
        const hashedPin = await hashPin(pin)

        // Update user's PIN
        await prisma.user.update({
            where: { email: session.user.email },
            data: { pin: hashedPin }
        })

        // Audit log
        await auditLog({
            userId: session.user.id,
            userEmail: session.user.email!,
            userRole: (session.user as any).role || 'USER',
            action: 'PIN_SET',
            entityType: 'User',
            entityId: session.user.id,
            metadata: {}
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error setting PIN:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

