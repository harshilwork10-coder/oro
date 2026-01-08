import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/provider/onboarding/requests/[id]/create-franchise - Create client from request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { actorUserId } = body;

        // Get the onboarding request
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: { franchisor: true },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (onboardingRequest.franchiseId) {
            return NextResponse.json(
                { error: 'Franchise already created for this request', franchiseId: onboardingRequest.franchiseId },
                { status: 400 }
            );
        }

        // Create the franchise (client)
        const franchise = await prisma.franchise.create({
            data: {
                name: onboardingRequest.contactName || `Client ${onboardingRequest.requestNumber}`,
                slug: `client-${Date.now()}`,
                franchisorId: onboardingRequest.franchisorId!,
                approvalStatus: 'APPROVED',
            },
        });

        // Link franchise to request
        await prisma.onboardingRequest.update({
            where: { id },
            data: { franchiseId: franchise.id },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 2, // NOTE
                message: `Client created: ${franchise.name}`,
                actorUserId,
            },
        });

        return NextResponse.json({ franchiseId: franchise.id, franchise }, { status: 201 });
    } catch (error) {
        console.error('Error creating franchise:', error);
        return NextResponse.json({ error: 'Failed to create franchise' }, { status: 500 });
    }
}
