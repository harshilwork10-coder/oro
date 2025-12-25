import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/provider/onboarding/requests/[id]/modules - Enable modules
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { businessType, enabledModules = [], actorUserId } = body;

        // Map business type
        const businessTypeMap: Record<string, number> = {
            RETAIL: 1,
            SALON: 2,
            BOTH: 3,
        };

        const updated = await prisma.onboardingRequest.update({
            where: { id },
            data: {
                businessType: businessTypeMap[businessType] || 3,
                notes: `Enabled modules: ${enabledModules.join(', ')}`,
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 2, // NOTE
                message: `Modules configured: ${businessType}, enabled: ${enabledModules.join(', ')}`,
                actorUserId,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating modules:', error);
        return NextResponse.json({ error: 'Failed to update modules' }, { status: 500 });
    }
}
