import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { hashPin, validatePin } from '@/lib/pinUtils'
import { logActivity } from '@/lib/auditLog'

export async function POST(request: Request) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email) {
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
            where: { email: user.email },
            data: { pin: hashedPin }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'USER',
            action: 'PIN_SET',
            entityType: 'User',
            entityId: user.id,
            metadata: {}
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error setting PIN:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

