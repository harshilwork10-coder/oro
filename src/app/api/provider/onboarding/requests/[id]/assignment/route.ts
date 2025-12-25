import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/provider/onboarding/requests/[id]/assignment - Assign agent
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { assignedToUserId, actorUserId } = body;

        const updated = await prisma.onboardingRequest.update({
            where: { id },
            data: { assignedToUserId },
        });

        // Add timeline event
        if (actorUserId) {
            await prisma.onboardingRequestEvent.create({
                data: {
                    onboardingRequestId: id,
                    eventType: 2, // NOTE
                    message: assignedToUserId
                        ? `Agent assigned`
                        : 'Agent unassigned',
                    actorUserId,
                },
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error assigning agent:', error);
        return NextResponse.json({ error: 'Failed to assign agent' }, { status: 500 });
    }
}
