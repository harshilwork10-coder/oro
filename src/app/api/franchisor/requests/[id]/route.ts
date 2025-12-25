import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/franchisor/requests/[id] - Get request detail
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: {
                locations: true,
                devices: {
                    include: {
                        terminal: true,
                    },
                },
                documents: true,
                shipments: {
                    include: {
                        items: true,
                        packages: true,
                    },
                },
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                franchisor: true,
                franchise: true,
                createdByUser: {
                    select: { id: true, name: true, email: true },
                },
                assignedToUser: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!onboardingRequest) {
            return NextResponse.json(
                { error: 'Request not found' },
                { status: 404 }
            );
        }

        // Map status/type to labels
        const statusMap: Record<number, string> = {
            1: 'SUBMITTED', 2: 'IN_REVIEW', 3: 'WAITING_DOCS',
            4: 'APPROVED', 5: 'SHIPPED', 6: 'ACTIVE', 7: 'REJECTED',
        };
        const typeMap: Record<number, string> = {
            1: 'NEW_FRANCHISEE', 2: 'ADD_LOCATION', 3: 'DEVICE_CHANGE',
        };
        const businessTypeMap: Record<number, string> = {
            1: 'RETAIL', 2: 'SALON', 3: 'BOTH',
        };

        return NextResponse.json({
            ...onboardingRequest,
            statusLabel: statusMap[onboardingRequest.status],
            typeLabel: typeMap[onboardingRequest.requestType],
            businessTypeLabel: businessTypeMap[onboardingRequest.businessType],
        });
    } catch (error) {
        console.error('Error fetching request:', error);
        return NextResponse.json(
            { error: 'Failed to fetch request' },
            { status: 500 }
        );
    }
}
