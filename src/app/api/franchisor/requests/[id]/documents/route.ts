import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DOC_STATUS = {
    MISSING: 1,
    UPLOADED: 2,
    VERIFIED: 3,
    REJECTED: 4,
} as const;

const DOC_TYPE = {
    DL: 1,
    SS4_FEIN: 2,
    VOID_CHECK: 3,
    LEASE: 4,
    OTHER: 5,
} as const;

// POST /api/franchisor/requests/[id]/documents - Upload document
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { docType, fileUrl, fileName, contentType, locationId, notes, uploadedByUserId } = body;

        // Verify request exists
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Create document
        const document = await prisma.onboardingRequestDocument.create({
            data: {
                onboardingRequestId: id,
                requestLocationId: locationId,
                docType: DOC_TYPE[docType as keyof typeof DOC_TYPE] || DOC_TYPE.OTHER,
                status: DOC_STATUS.UPLOADED,
                fileName,
                contentType,
                fileUrl,
                uploadedByUserId,
                uploadedAt: new Date(),
                notes,
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 4, // DOC_UPLOADED
                message: `Document uploaded: ${docType}`,
                actorUserId: uploadedByUserId,
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json(
            { error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}

// GET /api/franchisor/requests/[id]/documents - List documents
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const documents = await prisma.onboardingRequestDocument.findMany({
            where: { onboardingRequestId: id },
            orderBy: { createdAt: 'desc' },
        });

        const docTypeMap: Record<number, string> = {
            1: 'DL', 2: 'SS4_FEIN', 3: 'VOID_CHECK', 4: 'LEASE', 5: 'OTHER',
        };
        const statusMap: Record<number, string> = {
            1: 'MISSING', 2: 'UPLOADED', 3: 'VERIFIED', 4: 'REJECTED',
        };

        const mappedDocs = documents.map((doc) => ({
            ...doc,
            docTypeLabel: docTypeMap[doc.docType],
            statusLabel: statusMap[doc.status],
        }));

        return NextResponse.json(mappedDocs);
    } catch (error) {
        console.error('Error listing documents:', error);
        return NextResponse.json(
            { error: 'Failed to list documents' },
            { status: 500 }
        );
    }
}
