import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/provider/dealers/[id]
 * Update a dealer
 */
export async function PUT(
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
        const { dealerName, logoUrl, supportPhone, supportEmail, supportUrl } = body;

        const dealer = await prisma.dealerBranding.update({
            where: { id },
            data: {
                dealerName,
                logoUrl: logoUrl || null,
                supportPhone: supportPhone || null,
                supportEmail: supportEmail || null,
                supportUrl: supportUrl || null
            }
        });

        return NextResponse.json({ success: true, data: dealer });

    } catch (error) {
        console.error('Dealer update error:', error);
        return NextResponse.json({ error: 'Failed to update dealer' }, { status: 500 });
    }
}

/**
 * DELETE /api/provider/dealers/[id]
 * Delete a dealer
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { id } = await params;

        // Check if dealer has clients assigned
        const dealer = await prisma.dealerBranding.findUnique({
            where: { id },
            include: { _count: { select: { franchisors: true } } }
        });

        if (dealer?._count.franchisors && dealer._count.franchisors > 0) {
            return NextResponse.json({
                error: `Cannot delete dealer with ${dealer._count.franchisors} active clients. Reassign them first.`
            }, { status: 400 });
        }

        await prisma.dealerBranding.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Dealer delete error:', error);
        return NextResponse.json({ error: 'Failed to delete dealer' }, { status: 500 });
    }
}
