import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/provider/shipments/[id]/tracking - Update tracking
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { carrier, trackingNumber, shippedAt } = body;

        const shipment = await prisma.shipment.update({
            where: { id },
            data: {
                carrier,
                trackingNumber,
                shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
                status: 3, // SHIPPED
            },
        });

        return NextResponse.json(shipment);
    } catch (error) {
        console.error('Error updating tracking:', error);
        return NextResponse.json({ error: 'Failed to update tracking' }, { status: 500 });
    }
}
