import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/provider/onboarding/requests/[id] - Full request detail
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: {
                franchisor: true,
                franchise: true,
                createdByUser: { select: { id: true, name: true, email: true } },
                assignedToUser: { select: { id: true, name: true, email: true } },
                locations: {
                    include: {
                        location: true,
                        devices: { include: { terminal: true } },
                        documents: true,
                    },
                },
                devices: {
                    include: {
                        terminal: true,
                        location: { select: { id: true, name: true } },
                    },
                },
                documents: {
                    include: {
                        uploadedByUser: { select: { id: true, name: true } },
                        verifiedByUser: { select: { id: true, name: true } },
                    },
                },
                shipments: {
                    include: {
                        packages: true,
                        items: { include: { terminal: true } },
                        location: { select: { id: true, name: true } },
                    },
                },
                events: {
                    include: { actorUser: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
            },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const statusMap: Record<number, string> = {
            1: 'SUBMITTED', 2: 'IN_REVIEW', 3: 'WAITING_DOCS',
            4: 'APPROVED', 5: 'SHIPPED', 6: 'ACTIVE', 7: 'REJECTED',
        };
        const typeMap: Record<number, string> = {
            1: 'NEW_FRANCHISEE', 2: 'ADD_LOCATION', 3: 'DEVICE_CHANGE',
        };
        const businessTypeMap: Record<number, string> = { 1: 'RETAIL', 2: 'SALON', 3: 'BOTH' };

        return NextResponse.json({
            ...onboardingRequest,
            statusLabel: statusMap[onboardingRequest.status],
            typeLabel: typeMap[onboardingRequest.requestType],
            businessTypeLabel: businessTypeMap[onboardingRequest.businessType],
        });
    } catch (error) {
        console.error('Error fetching request detail:', error);
        return NextResponse.json({ error: 'Failed to fetch request detail' }, { status: 500 });
    }
}

// PATCH /api/provider/onboarding/requests/[id] - Update notes
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { notes, internalNotes } = body;

        const updated = await prisma.onboardingRequest.update({
            where: { id },
            data: {
                ...(notes !== undefined && { notes }),
                ...(internalNotes !== undefined && { internalNotes }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating request:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}
