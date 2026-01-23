// Reset password for franchisor/owner - Provider can reset
// PATCH /api/provider/owners/[id]/reset-password

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    // Only Provider can reset owner passwords
    if (!session?.user?.id || (session.user as any).role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    // Validate password
    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Find the user - must be OWNER or FRANCHISOR role
    const user = await prisma.user.findFirst({
        where: {
            id,
            role: { in: ['OWNER', 'FRANCHISOR'] }
        },
        select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    return NextResponse.json({
        success: true,
        message: `Password reset for ${user.email}. Share the new password securely with the owner.`
    });
}
