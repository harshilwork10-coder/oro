import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Status/Type maps
const REQUEST_STATUS = {
    SUBMITTED: 1, IN_REVIEW: 2, WAITING_DOCS: 3,
    APPROVED: 4, SHIPPED: 5, ACTIVE: 6, REJECTED: 7,
} as const;

const REQUEST_TYPE = {
    NEW_FRANCHISEE: 1, ADD_LOCATION: 2, DEVICE_CHANGE: 3,
} as const;

// GET /api/provider/onboarding/requests - Queue list
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const assignedTo = searchParams.get('assignedTo');
        const franchisorId = searchParams.get('franchisorId');
        const q = searchParams.get('q');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status) {
            const statusNum = REQUEST_STATUS[status as keyof typeof REQUEST_STATUS];
            if (statusNum) where.status = statusNum;
        }

        if (type) {
            const typeNum = REQUEST_TYPE[type as keyof typeof REQUEST_TYPE];
            if (typeNum) where.requestType = typeNum;
        }

        if (assignedTo) {
            if (assignedTo === 'unassigned') {
                where.assignedToUserId = null;
            } else {
                where.assignedToUserId = assignedTo;
            }
        }

        if (franchisorId) where.franchisorId = franchisorId;

        if (from || to) {
            where.submittedAt = {};
            if (from) (where.submittedAt as Record<string, Date>).gte = new Date(from);
            if (to) (where.submittedAt as Record<string, Date>).lte = new Date(to);
        }

        if (q) {
            where.OR = [
                { contactName: { contains: q } },
                { requestNumber: { contains: q } },
                { contactEmail: { contains: q } },
            ];
        }

        const [requests, total] = await Promise.all([
            prisma.onboardingRequest.findMany({
                where,
                include: {
                    franchisor: { select: { id: true, name: true } },
                    franchise: { select: { id: true, name: true } },
                    assignedToUser: { select: { id: true, name: true } },
                    locations: { select: { id: true, locationName: true, city: true, state: true } },
                    _count: {
                        select: { locations: true, devices: true, documents: true, shipments: true },
                    },
                },
                orderBy: { submittedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.onboardingRequest.count({ where }),
        ]);

        const statusMap: Record<number, string> = {
            1: 'SUBMITTED', 2: 'IN_REVIEW', 3: 'WAITING_DOCS',
            4: 'APPROVED', 5: 'SHIPPED', 6: 'ACTIVE', 7: 'REJECTED',
        };
        const typeMap: Record<number, string> = {
            1: 'NEW_FRANCHISEE', 2: 'ADD_LOCATION', 3: 'DEVICE_CHANGE',
        };
        const businessTypeMap: Record<number, string> = { 1: 'RETAIL', 2: 'SALON', 3: 'BOTH' };

        const mappedRequests = requests.map((req) => ({
            ...req,
            statusLabel: statusMap[req.status],
            typeLabel: typeMap[req.requestType],
            businessTypeLabel: businessTypeMap[req.businessType],
        }));

        return NextResponse.json({
            data: mappedRequests,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        console.error('Error listing onboarding queue:', error);
        return NextResponse.json({ error: 'Failed to list onboarding queue' }, { status: 500 });
    }
}
