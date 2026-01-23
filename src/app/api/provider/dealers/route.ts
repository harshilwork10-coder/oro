import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/provider/dealers
 * List all dealers (Provider only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Provider can access
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const dealers = await prisma.dealerBranding.findMany({
            include: {
                _count: {
                    select: { franchisors: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: dealers.map(d => ({
                id: d.id,
                dealerName: d.dealerName,
                logoUrl: d.logoUrl,
                supportPhone: d.supportPhone,
                supportEmail: d.supportEmail,
                supportUrl: d.supportUrl,
                clientCount: d._count.franchisors,
                createdAt: d.createdAt
            }))
        });

    } catch (error) {
        console.error('Dealers list error:', error);
        return NextResponse.json({ error: 'Failed to load dealers' }, { status: 500 });
    }
}

/**
 * POST /api/provider/dealers
 * Create a new dealer (Provider only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await request.json();
        const { dealerName, logoUrl, supportPhone, supportEmail, supportUrl } = body;

        if (!dealerName) {
            return NextResponse.json({ error: 'Dealer name is required' }, { status: 400 });
        }

        const dealer = await prisma.dealerBranding.create({
            data: {
                dealerName,
                logoUrl: logoUrl || null,
                supportPhone: supportPhone || null,
                supportEmail: supportEmail || null,
                supportUrl: supportUrl || null
            }
        });

        return NextResponse.json({
            success: true,
            data: dealer
        });

    } catch (error) {
        console.error('Dealer create error:', error);
        return NextResponse.json({ error: 'Failed to create dealer' }, { status: 500 });
    }
}
