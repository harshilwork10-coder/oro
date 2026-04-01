/**
 * GET /api/franchisor/my-role
 *
 * Returns the caller's HQ role (from FranchisorMembership).
 * Used by the franchisor layout to gate nav items client-side.
 *
 * Response: { hqRole: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Primary owner check
        const ownedFranchisor = await prisma.franchisor.findFirst({
            where: { ownerId: authUser.id },
            select: { id: true }
        });
        if (ownedFranchisor) {
            return NextResponse.json({ hqRole: 'OWNER', franchisorId: ownedFranchisor.id });
        }

        // Membership lookup
        const membership = await prisma.franchisorMembership.findFirst({
            where: { userId: authUser.id },
            select: { role: true, franchisorId: true }
        });
        if (!membership) {
            return NextResponse.json({ error: 'No HQ membership found' }, { status: 403 });
        }

        return NextResponse.json({ hqRole: membership.role, franchisorId: membership.franchisorId });
    } catch (error) {
        console.error('[my-role GET]', error);
        return NextResponse.json({ error: 'Failed to resolve HQ role' }, { status: 500 });
    }
}
