// Route Handler for franchisor franchisees API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Helper to get franchisor for current user (matching auth.ts pattern)
async function getFranchisorForUser(userId: string) {
    // Check if user owns a franchisor (same as auth.ts line 127-130)
    const franchisor = await prisma.franchisor.findFirst({
        where: { ownerId: userId }
    });

    return franchisor;
}

// GET /api/franchisor/franchisees - List franchisee LLCs for this HQ
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const franchisor = await getFranchisorForUser(session.user.id);
    if (!franchisor) {
        return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
    }

    // Get all franchises (businesses) under this franchisor with owner info
    const franchises = await prisma.franchise.findMany({
        where: { franchisorId: franchisor.id },
        include: {
            _count: {
                select: { locations: true }
            },
            users: {
                where: { role: 'FRANCHISEE' },
                select: { id: true, name: true, email: true },
                take: 1
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Map to franchisee format with owner info
    const franchisees = franchises.map(f => ({
        id: f.id,
        name: f.name,
        locationCount: f._count.locations,
        status: f.approvalStatus || f.accountStatus || 'ACTIVE',
        ownerName: f.users[0]?.name || null,
        ownerEmail: f.users[0]?.email || null,
        createdAt: f.createdAt
    }));

    return NextResponse.json({ data: franchisees });
}

// POST /api/franchisor/franchisees - Create a new franchisee LLC + owner
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const franchisor = await getFranchisorForUser(session.user.id);
    if (!franchisor) {
        return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
        // LLC Info
        legalName,
        dbaName,
        businessPhone,
        businessEmail,
        mailingAddress,
        // Owner Info
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerPassword,  // Password set by franchisor
        // Optional
        franchiseeType,
        region,
        notes
    } = body;

    // Validate required fields
    if (!legalName) {
        return NextResponse.json({ error: 'Legal LLC name is required' }, { status: 400 });
    }
    if (!businessEmail) {
        return NextResponse.json({ error: 'Business email is required' }, { status: 400 });
    }
    if (!ownerName) {
        return NextResponse.json({ error: 'Owner name is required' }, { status: 400 });
    }
    if (!ownerEmail) {
        return NextResponse.json({ error: 'Owner email is required' }, { status: 400 });
    }
    if (!ownerPassword || ownerPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if owner email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: ownerEmail.toLowerCase() }
    });
    if (existingUser) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Create slug from legal name
    const baseSlug = legalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingCount = await prisma.franchise.count({
        where: { slug: { startsWith: baseSlug } }
    });
    const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

    // Hash the password provided by franchisor
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create franchise + owner in transaction
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create the franchise (franchisee LLC)
        const franchise = await tx.franchise.create({
            data: {
                name: legalName,
                slug,
                franchisorId: franchisor.id,
                approvalStatus: 'APPROVED', // Auto-approve when HQ creates
                accountStatus: 'ACTIVE',
            }
        });

        // 2. Create the owner user
        const owner = await tx.user.create({
            data: {
                name: ownerName,
                email: ownerEmail.toLowerCase(),
                phone: ownerPhone || null,
                password: hashedPassword,
                role: 'FRANCHISEE', // Franchisee owner role
                isActive: true,
                franchiseId: franchise.id,
            }
        });

        return { franchise, owner };
    });

    // Password is set by franchisor - owner can login immediately
    // Optional: Send welcome email to owner with login instructions

    return NextResponse.json({
        success: true,
        franchisee: {
            id: result.franchise.id,
            name: result.franchise.name,
            locationCount: 0,
            status: result.franchise.approvalStatus || 'ACTIVE',
            ownerName: result.owner.name,
            ownerEmail: result.owner.email,
            createdAt: result.franchise.createdAt
        }
    });
}
