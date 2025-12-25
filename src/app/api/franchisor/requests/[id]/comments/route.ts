import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/franchisor/requests/[id]/comments - Add comment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { message, userId } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Verify request exists
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Add comment as event
        const event = await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 2, // NOTE
                message,
                actorUserId: userId,
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json(
            { error: 'Failed to add comment' },
            { status: 500 }
        );
    }
}

// GET /api/franchisor/requests/[id]/comments - List comments
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const events = await prisma.onboardingRequestEvent.findMany({
            where: {
                onboardingRequestId: id,
                eventType: 2, // NOTE only
            },
            include: {
                actorUser: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error('Error listing comments:', error);
        return NextResponse.json(
            { error: 'Failed to list comments' },
            { status: 500 }
        );
    }
}
