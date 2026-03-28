// Reset password for franchisee owner - Franchisor can reset

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/auditLog';

// Helper to get franchisor for current user
async function getFranchisorForUser(userId: string) {
    return prisma.franchisor.findFirst({
        where: { ownerId: userId }
    });
}

// PATCH /api/franchisor/franchisees/[id]/reset-password
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    ;
    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const franchisor = await getFranchisorForUser(user.id);
    if (!franchisor) {
        return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    // Validate password
    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Get the franchise and verify it belongs to this franchisor
    const franchise = await prisma.franchise.findFirst({
        where: {
            id,
            franchisorId: franchisor.id
        },
        include: {
            users: {
                where: { role: 'FRANCHISEE' },
                select: { id: true, email: true, name: true },
                take: 1
            }
        }
    });

    if (!franchise) {
        return NextResponse.json({ error: 'Franchisee not found' }, { status: 404 });
    }

    const owner = franchise.users[0];
    if (!owner) {
        return NextResponse.json({ error: 'No owner found for this franchisee' }, { status: 404 });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: owner.id },
        data: { password: hashedPassword }
    });

    // Audit log
    await logActivity({
        userId: user.id,
        userEmail: user.email,
        userRole: 'FRANCHISOR',
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: owner.id,
        metadata: { targetEmail: owner.email, resetBy: 'franchisor' }
    });

    return NextResponse.json({
        success: true,
        message: `Password reset for ${owner.email}. Share the new password with the owner.`
    });
  } catch (error) {
    console.error('[FRANCHISOR_RESET_PASSWORD]', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
