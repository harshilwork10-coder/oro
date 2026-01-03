import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const REQUEST_STATUS = {
    SUBMITTED: 1, IN_REVIEW: 2, WAITING_DOCS: 3,
    APPROVED: 4, SHIPPED: 5, ACTIVE: 6, REJECTED: 7,
} as const;

// PATCH /api/provider/onboarding/requests/[id]/status - Change status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, reason, actorUserId } = body;

        const statusNum = REQUEST_STATUS[status as keyof typeof REQUEST_STATUS];
        if (!statusNum) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {
            status: statusNum,
            lastStatusAt: new Date(),
        };

        // Set timestamp based on status
        if (statusNum === REQUEST_STATUS.APPROVED) {
            updateData.approvedAt = new Date();
        } else if (statusNum === REQUEST_STATUS.REJECTED) {
            updateData.rejectedAt = new Date();
            updateData.rejectedReason = reason;
        } else if (statusNum === REQUEST_STATUS.ACTIVE) {
            updateData.activatedAt = new Date();
        }

        const updated = await prisma.onboardingRequest.update({
            where: { id },
            data: updateData,
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 1, // STATUS_CHANGE
                message: `Status changed to ${status}${reason ? `: ${reason}` : ''}`,
                actorUserId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error changing status:', error);
        return NextResponse.json({ error: 'Failed to change status' }, { status: 500 });
    }
}
