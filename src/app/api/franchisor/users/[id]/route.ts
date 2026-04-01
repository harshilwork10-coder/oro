/**
 * PATCH /api/franchisor/users/[id] — Change HQ role or disable/enable a member
 * DELETE /api/franchisor/users/[id] — Remove a member from the HQ (deletes membership only, not user)
 *
 * Only OWNER-role callers can modify memberships.
 * The primary owner (Franchisor.ownerId) cannot be removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

async function getFranchisorId(userId: string): Promise<string | null> {
    const owned = await prisma.franchisor.findFirst({
        where: { ownerId: userId },
        select: { id: true }
    });
    if (owned) return owned.id;

    const mem = await prisma.franchisorMembership.findFirst({
        where: { userId },
        select: { franchisorId: true }
    });
    return mem?.franchisorId ?? null;
}

async function isCallerOwner(userId: string, franchisorId: string): Promise<boolean> {
    const isPrimaryOwner = await prisma.franchisor.findFirst({
        where: { id: franchisorId, ownerId: userId },
        select: { id: true }
    });
    if (isPrimaryOwner) return true;

    const mem = await prisma.franchisorMembership.findFirst({
        where: { userId, franchisorId, role: 'OWNER' },
        select: { id: true }
    });
    return !!mem;
}

// PATCH — update hqRole or isActive on a membership
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorId(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        if (!(await isCallerOwner(authUser.id, franchisorId))) {
            return NextResponse.json({ error: 'Only HQ Owners can modify memberships.' }, { status: 403 });
        }

        const membershipId = params.id;
        const body = await req.json();
        const { hqRole, isActive } = body;

        // Verify membership belongs to this franchisor
        const membership = await prisma.franchisorMembership.findFirst({
            where: { id: membershipId, franchisorId },
            include: { user: { select: { id: true } } }
        });
        if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

        // Block removing OWNER role from the primary owner
        const isPrimary = await prisma.franchisor.findFirst({
            where: { id: franchisorId, ownerId: membership.user.id },
            select: { id: true }
        });
        if (isPrimary && hqRole && hqRole !== 'OWNER') {
            return NextResponse.json({ error: 'Cannot change the primary owner\'s role.' }, { status: 400 });
        }

        const updates: Record<string, unknown> = {};
        if (hqRole) updates.role = hqRole;

        // Also update user.isActive for enable/disable
        if (typeof isActive === 'boolean') {
            await prisma.user.update({
                where: { id: membership.user.id },
                data: { isActive }
            });
        }

        if (Object.keys(updates).length > 0) {
            await prisma.franchisorMembership.update({
                where: { id: membershipId },
                data: updates
            });
        }

        return NextResponse.json({ success: true, message: 'Membership updated.' });
    } catch (error) {
        console.error('[HQ Users PATCH]', error);
        return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
    }
}

// DELETE — remove HQ membership (but keep user record)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorId(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        if (!(await isCallerOwner(authUser.id, franchisorId))) {
            return NextResponse.json({ error: 'Only HQ Owners can remove members.' }, { status: 403 });
        }

        const membershipId = params.id;
        const membership = await prisma.franchisorMembership.findFirst({
            where: { id: membershipId, franchisorId },
            include: { user: { select: { id: true } } }
        });
        if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });

        // Block deleting the primary owner
        const isPrimary = await prisma.franchisor.findFirst({
            where: { id: franchisorId, ownerId: membership.user.id },
            select: { id: true }
        });
        if (isPrimary) {
            return NextResponse.json({ error: 'Cannot remove the primary brand owner.' }, { status: 400 });
        }

        await prisma.franchisorMembership.delete({ where: { id: membershipId } });
        return NextResponse.json({ success: true, message: 'HQ member removed.' });
    } catch (error) {
        console.error('[HQ Users DELETE]', error);
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
