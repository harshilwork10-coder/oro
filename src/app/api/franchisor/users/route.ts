/**
 * Franchisor HQ Users API
 *
 * GET  — List all HQ members (FranchisorMembership records)
 * POST — Create a new HQ user + FranchisorMembership with assigned role
 *
 * HQ roles: OWNER | ADMIN | ACCOUNTANT | VIEWER
 * Only OWNER-membership holders (or the franchisor system user) can manage members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Resolve franchisorId for the calling user
async function getFranchisorId(userId: string): Promise<string | null> {
    // Primary owner path: Franchisor.ownerId = userId
    const ownedFranchisor = await prisma.franchisor.findFirst({
        where: { ownerId: userId },
        select: { id: true }
    });
    if (ownedFranchisor) return ownedFranchisor.id;

    // Membership path: user was added as HQ member
    const membership = await prisma.franchisorMembership.findFirst({
        where: { userId },
        select: { franchisorId: true }
    });
    return membership?.franchisorId ?? null;
}

// Resolve the calling user's HQ role (OWNER assumed for franchisor system user)
async function getCallerHQRole(userId: string, franchisorId: string): Promise<string> {
    // Check if they are the primary owner
    const isOwner = await prisma.franchisor.findFirst({
        where: { id: franchisorId, ownerId: userId },
        select: { id: true }
    });
    if (isOwner) return 'OWNER';

    const membership = await prisma.franchisorMembership.findFirst({
        where: { userId, franchisorId },
        select: { role: true }
    });
    return membership?.role ?? 'VIEWER';
}

// GET — return all HQ memberships
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorId(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        // Include the primary owner (Franchisor.ownerId) in results
        const franchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: {
                ownerId: true,
                memberships: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                isActive: true,
                                lastLoginAt: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!franchisor) return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });

        // Build list
        const membershipMap = new Map<string, object>();

        // Add shared memberships
        for (const m of franchisor.memberships) {
            membershipMap.set(m.user.id, {
                membershipId: m.id,
                userId: m.user.id,
                name: m.user.name || 'Unknown',
                email: m.user.email,
                hqRole: m.role,
                isPrimary: m.isPrimary,
                isOwner: m.user.id === franchisor.ownerId,
                isActive: m.user.isActive !== false,
                lastLogin: m.user.lastLoginAt ?? null,
                createdAt: m.createdAt,
            });
        }

        // Ensure primary owner always appears (even if no explicit membership)
        if (franchisor.ownerId && !membershipMap.has(franchisor.ownerId)) {
            const ownerUser = await prisma.user.findUnique({
                where: { id: franchisor.ownerId },
                select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true }
            });
            if (ownerUser) {
                membershipMap.set(ownerUser.id, {
                    membershipId: null,
                    userId: ownerUser.id,
                    name: ownerUser.name || 'Unknown',
                    email: ownerUser.email,
                    hqRole: 'OWNER',
                    isPrimary: true,
                    isOwner: true,
                    isActive: ownerUser.isActive !== false,
                    lastLogin: ownerUser.lastLoginAt ?? null,
                    createdAt: null,
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: Array.from(membershipMap.values())
        });
    } catch (error) {
        console.error('[HQ Users GET]', error);
        return NextResponse.json({ error: 'Failed to load HQ users' }, { status: 500 });
    }
}

// POST — create a new HQ user + FranchisorMembership
export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        if (!authUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const franchisorId = await getFranchisorId(authUser.id);
        if (!franchisorId) return NextResponse.json({ error: 'No HQ context' }, { status: 403 });

        // Only OWNER can create new HQ users
        const callerRole = await getCallerHQRole(authUser.id, franchisorId);
        if (callerRole !== 'OWNER') {
            return NextResponse.json({ error: 'Only HQ Owners can add new users.' }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, hqRole } = body;

        // Validate
        if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

        const validRoles = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'VIEWER'];
        const role: string = validRoles.includes(hqRole) ? hqRole : 'VIEWER';

        // Check for existing user
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            // If user exists, check if already a member
            const existingMembership = await prisma.franchisorMembership.findFirst({
                where: { userId: existing.id, franchisorId }
            });
            if (existingMembership) {
                return NextResponse.json({ error: 'This user is already a member of this HQ.' }, { status: 400 });
            }
            // Add existing user as a new HQ member
            const membership = await prisma.franchisorMembership.create({
                data: { userId: existing.id, franchisorId, role, isPrimary: false }
            });
            return NextResponse.json({
                success: true,
                message: 'Existing user added to HQ with role ' + role,
                membershipId: membership.id,
                userId: existing.id
            });
        }

        // Create new user with FRANCHISOR role (enables HQ login) + membership
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: 'FRANCHISOR',  // System role for HQ access
                    isActive: true,
                }
            });
            const membership = await tx.franchisorMembership.create({
                data: {
                    userId: user.id,
                    franchisorId,
                    role,               // HQ sub-role (OWNER/ADMIN/ACCOUNTANT/VIEWER)
                    isPrimary: false,
                }
            });
            return { user, membership };
        });

        return NextResponse.json({
            success: true,
            message: `HQ user created with role ${role}`,
            membershipId: result.membership.id,
            userId: result.user.id,
        });
    } catch (error) {
        console.error('[HQ Users POST]', error);
        return NextResponse.json({ error: 'Failed to create HQ user' }, { status: 500 });
    }
}
