import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DOC_TYPE = {
    DL: 1,
    SS4_FEIN: 2,
    VOID_CHECK: 3,
    LEASE: 4,
    OTHER: 5,
} as const;

// POST /api/provider/onboarding/requests/[id]/documents/request - Send doc request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { docTypes = [], delivery = ['email'], messageTemplateId, customMessage, actorUserId } = body;

        // Verify request exists
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Create missing doc placeholders
        const createdDocs = [];
        for (const docType of docTypes) {
            const docTypeNum = DOC_TYPE[docType as keyof typeof DOC_TYPE] || DOC_TYPE.OTHER;

            const doc = await prisma.onboardingRequestDocument.create({
                data: {
                    onboardingRequestId: id,
                    docType: docTypeNum,
                    status: 1, // MISSING
                    notes: `Requested via ${delivery.join(', ')}`,
                },
            });
            createdDocs.push(doc);
        }

        // Update request status to WAITING_DOCS
        await prisma.onboardingRequest.update({
            where: { id },
            data: {
                status: 3, // WAITING_DOCS
                lastStatusAt: new Date(),
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 3, // DOC_REQUEST
                message: `Document request sent for: ${docTypes.join(', ')} via ${delivery.join(', ')}`,
                actorUserId,
            },
        });

        // TODO: Actually send email/SMS based on delivery method
        // This would integrate with SendGrid, Twilio, etc.

        return NextResponse.json({
            success: true,
            documentsRequested: createdDocs.length,
            delivery,
        }, { status: 201 });
    } catch (error) {
        console.error('Error requesting documents:', error);
        return NextResponse.json({ error: 'Failed to request documents' }, { status: 500 });
    }
}
