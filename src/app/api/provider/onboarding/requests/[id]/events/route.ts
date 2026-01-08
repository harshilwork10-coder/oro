import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/provider/onboarding/requests/[id]/events - List timeline events
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const events = await prisma.onboardingRequestEvent.findMany({
            where: { onboardingRequestId: id },
            include: {
                actorUser: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const eventTypeMap: Record<number, string> = {
            1: 'STATUS_CHANGE',
            2: 'NOTE',
            3: 'DOC_REQUEST',
            4: 'DOC_UPLOADED',
            5: 'DOC_VERIFIED',
            6: 'DEVICE_ASSIGNED',
            7: 'SHIPMENT_CREATED',
            8: 'ACTIVATED',
        };

        const mappedEvents = events.map((event) => ({
            ...event,
            eventTypeLabel: eventTypeMap[event.eventType],
        }));

        return NextResponse.json(mappedEvents);
    } catch (error) {
        console.error('Error listing events:', error);
        return NextResponse.json({ error: 'Failed to list events' }, { status: 500 });
    }
}

// POST /api/provider/onboarding/requests/[id]/events - Add internal note
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { type = 'NOTE', message, actorUserId } = body;

        const eventTypeMap: Record<string, number> = {
            STATUS_CHANGE: 1,
            NOTE: 2,
            DOC_REQUEST: 3,
            DOC_UPLOADED: 4,
            DOC_VERIFIED: 5,
            DEVICE_ASSIGNED: 6,
            SHIPMENT_CREATED: 7,
            ACTIVATED: 8,
        };

        const event = await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: eventTypeMap[type] || 2,
                message,
                actorUserId,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Error adding event:', error);
        return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
    }
}
