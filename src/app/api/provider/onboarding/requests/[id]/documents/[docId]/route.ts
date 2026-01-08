import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/provider/onboarding/requests/[requestId]/documents/[documentId] - Verify/reject doc
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; docId: string }> }
) {
    try {
        const { id, docId } = await params;
        const body = await request.json();
        const { status, reason, actorUserId } = body;

        const statusMap: Record<string, number> = {
            VERIFIED: 3,
            REJECTED: 4,
        };

        const statusNum = statusMap[status];
        if (!statusNum) {
            return NextResponse.json({ error: 'Invalid status. Use VERIFIED or REJECTED' }, { status: 400 });
        }

        const doc = await prisma.onboardingRequestDocument.update({
            where: { id: docId },
            data: {
                status: statusNum,
                verifiedByUserId: actorUserId,
                verifiedAt: new Date(),
                rejectReason: status === 'REJECTED' ? reason : null,
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: status === 'VERIFIED' ? 5 : 2, // DOC_VERIFIED or NOTE
                message: status === 'VERIFIED'
                    ? `Document verified`
                    : `Document rejected: ${reason || 'No reason provided'}`,
                actorUserId,
            },
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }
}
