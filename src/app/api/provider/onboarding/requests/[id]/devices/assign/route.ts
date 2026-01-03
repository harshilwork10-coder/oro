import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEVICE_TYPE = {
    PAYMENT_TERMINAL: 1,
    STATION_REGISTER: 2,
    OTHER: 3,
} as const;

const ASSIGNMENT_STATUS = {
    RESERVED: 1,
    ASSIGNED: 2,
    REMOVED: 3,
} as const;

// POST /api/provider/onboarding/requests/[id]/devices/assign - Assign device to request
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            requestLocationId,
            terminalId,
            serialNumber,
            model,
            ip,
            port,
            deviceType = 'PAYMENT_TERMINAL',
            notes,
            actorUserId,
        } = body;

        // Verify request exists
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Create device assignment
        const device = await prisma.onboardingRequestDevice.create({
            data: {
                onboardingRequestId: id,
                requestLocationId,
                terminalId,
                deviceType: DEVICE_TYPE[deviceType as keyof typeof DEVICE_TYPE] || DEVICE_TYPE.PAYMENT_TERMINAL,
                model,
                serialNumber,
                ipAddress: ip,
                port,
                assignmentStatus: ASSIGNMENT_STATUS.ASSIGNED,
                assignedAt: new Date(),
                notes,
            },
        });

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 6, // DEVICE_ASSIGNED
                message: `Device assigned: ${serialNumber || model || terminalId}`,
                actorUserId,
            },
        });

        return NextResponse.json(device, { status: 201 });
    } catch (error) {
        console.error('Error assigning device:', error);
        return NextResponse.json({ error: 'Failed to assign device' }, { status: 500 });
    }
}

// GET /api/provider/onboarding/requests/[id]/devices/assign - List assigned devices
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const devices = await prisma.onboardingRequestDevice.findMany({
            where: { onboardingRequestId: id },
            include: {
                terminal: true,
                location: { select: { id: true, name: true } },
                requestLocation: { select: { id: true, locationName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(devices);
    } catch (error) {
        console.error('Error listing devices:', error);
        return NextResponse.json({ error: 'Failed to list devices' }, { status: 500 });
    }
}
