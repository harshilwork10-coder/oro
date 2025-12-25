import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/provider/shipments/[id]/delivered - Mark delivered
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { deliveredAt, proofUrl } = body;

        const shipment = await prisma.shipment.update({
            where: { id },
            data: {
                deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date(),
                status: 4, // DELIVERED
                notes: proofUrl ? `Proof: ${proofUrl}` : undefined,
            },
        });

        return NextResponse.json(shipment);
    } catch (error) {
        console.error('Error marking delivered:', error);
        return NextResponse.json({ error: 'Failed to mark delivered' }, { status: 500 });
    }
}
