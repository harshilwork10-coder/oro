// Reset password for franchisor/owner - Provider can reset
// PATCH /api/provider/owners/[id]/reset-password

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/auditLog'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser?.id || authUser.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 })
    }

    const { id } = await params
    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find the user - must be OWNER or FRANCHISOR role
    const targetUser = await prisma.user.findFirst({
        where: { id, role: { in: ['OWNER', 'FRANCHISOR'] } },
        select: { id: true, email: true, name: true, role: true }
    })

    if (!targetUser) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: targetUser.id }, data: { password: hashedPassword } })

    await logActivity({
        userId: authUser.id,
        userEmail: authUser.email || '',
        userRole: 'PROVIDER',
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: targetUser.id,
    })

    return NextResponse.json({
        success: true,
        message: `Password reset for ${targetUser.email}. Share the new password securely with the owner.`
    })
  } catch (error) {
    console.error('[PROVIDER_RESET_PASSWORD]', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
