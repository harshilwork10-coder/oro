import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { applyRateLimit, RATE_LIMITS, validateCuid } from '@/lib/security'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can reset owner passwords
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied - only providers can reset owner passwords' }, { status: 403 })
        }

        // Rate limiting - prevent brute force
        const rateLimitResponse = await applyRateLimit(
            `/api/admin/reset-owner-password:${session.user.id}`,
            RATE_LIMITS.passwordReset
        )
        if (rateLimitResponse) return rateLimitResponse

        const { ownerId, password } = await request.json()

        // Validate inputs
        const ownerIdValidation = validateCuid(ownerId)
        if (!ownerIdValidation.valid) {
            return NextResponse.json({ error: 'Invalid owner ID format' }, { status: 400 })
        }

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Verify the user exists and is a franchisor owner
        const owner = await prisma.user.findUnique({
            where: { id: ownerId },
            include: { franchisor: true }
        })

        if (!owner) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (owner.role !== 'FRANCHISOR' || !owner.franchisor) {
            return NextResponse.json({ error: 'User is not a franchisor owner' }, { status: 400 })
        }

        // Hash and update password with bcrypt cost factor 12
        const hashedPassword = await bcrypt.hash(password, 12)

        await prisma.user.update({
            where: { id: ownerId },
            data: { password: hashedPassword }
        })

        // Debug log removed

        // Audit log — CRITICAL SECURITY EVENT
        await auditLog({
            userId: session.user.id,
            userEmail: (session.user as any).email,
            userRole: 'PROVIDER',
            action: 'ADMIN_PASSWORD_RESET',
            entityType: 'User',
            entityId: ownerId,
            metadata: { targetEmail: owner.email, targetRole: 'FRANCHISOR', franchisorId: owner.franchisor?.id }
        })

        return NextResponse.json({ success: true, message: 'Password reset successfully' })
    } catch (error) {
        console.error('Error resetting owner password:', error)
        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        )
    }
}

