import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/provider/accounts/[id]/dealer
 * Assign or change dealer for a franchisor account
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { dealerBrandingId } = body;  // Can be null to unassign

        // Verify franchisor exists
        const franchisor = await prisma.franchisor.findUnique({
            where: { id }
        });

        if (!franchisor) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // If assigning a dealer, verify it exists
        if (dealerBrandingId) {
            const dealer = await prisma.dealerBranding.findUnique({
                where: { id: dealerBrandingId }
            });
            if (!dealer) {
                return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
            }
        }

        // Update franchisor's dealer
        const updated = await prisma.franchisor.update({
            where: { id },
            data: { dealerBrandingId: dealerBrandingId || null },
            include: {
                dealerBranding: {
                    select: { dealerName: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                dealerBrandingId: updated.dealerBrandingId,
                dealerName: updated.dealerBranding?.dealerName || null
            }
        });

    } catch (error) {
        console.error('Dealer assignment error:', error);
        return NextResponse.json({ error: 'Failed to assign dealer' }, { status: 500 });
    }
}

/**
 * GET /api/provider/accounts/[id]/dealer
 * Get current dealer for a franchisor
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { id } = await params;

        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            include: {
                dealerBranding: true
            }
        });

        if (!franchisor) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                dealerBrandingId: franchisor.dealerBrandingId,
                dealer: franchisor.dealerBranding
            }
        });

    } catch (error) {
        console.error('Get dealer error:', error);
        return NextResponse.json({ error: 'Failed to get dealer' }, { status: 500 });
    }
}
