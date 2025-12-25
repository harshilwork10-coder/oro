import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Status constants
const REQUEST_STATUS = {
    SUBMITTED: 1,
    IN_REVIEW: 2,
    WAITING_DOCS: 3,
    APPROVED: 4,
    SHIPPED: 5,
    ACTIVE: 6,
    REJECTED: 7,
} as const;

const REQUEST_TYPE = {
    NEW_FRANCHISEE: 1,
    ADD_LOCATION: 2,
    DEVICE_CHANGE: 3,
} as const;

const BUSINESS_TYPE = {
    RETAIL: 1,
    SALON: 2,
    BOTH: 3,
} as const;

// Generate unique request number
function generateRequestNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `ORX-ONB-${date}-${random}`;
}

// POST /api/franchisor/requests - Create onboarding request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            type,
            franchiseeDraft,
            locations = [],
            hardwareNeeds = [],
            notes,
            franchisorId,
            createdByUserId,
        } = body;

        // Validate required fields
        if (!type || !createdByUserId) {
            return NextResponse.json(
                { error: 'Missing required fields: type, createdByUserId' },
                { status: 400 }
            );
        }

        // Map type string to numeric
        const requestType = REQUEST_TYPE[type as keyof typeof REQUEST_TYPE] || REQUEST_TYPE.NEW_FRANCHISEE;

        // Create the onboarding request
        const onboardingRequest = await prisma.onboardingRequest.create({
            data: {
                requestNumber: generateRequestNumber(),
                requestType,
                status: REQUEST_STATUS.SUBMITTED,
                franchisorId,
                createdByUserId,
                businessType: BUSINESS_TYPE[franchiseeDraft?.businessType as keyof typeof BUSINESS_TYPE] || BUSINESS_TYPE.RETAIL,
                contactName: franchiseeDraft?.contactName,
                contactEmail: franchiseeDraft?.contactEmail,
                contactPhone: franchiseeDraft?.contactPhone,
                notes,
                locations: {
                    create: locations.map((loc: {
                        name: string;
                        phone?: string;
                        address1: string;
                        address2?: string;
                        city: string;
                        state: string;
                        postalCode: string;
                        country?: string;
                        requestedTerminals?: number;
                        requestedStations?: number;
                        notes?: string;
                    }, index: number) => ({
                        locationName: loc.name,
                        phone: loc.phone,
                        address1: loc.address1,
                        address2: loc.address2,
                        city: loc.city,
                        state: loc.state,
                        postalCode: loc.postalCode,
                        country: loc.country || 'USA',
                        requestedTerminals: loc.requestedTerminals || hardwareNeeds.find((h: { locationIndex: number }) => h.locationIndex === index)?.terminals || 0,
                        requestedStations: loc.requestedStations || hardwareNeeds.find((h: { locationIndex: number }) => h.locationIndex === index)?.stations || 0,
                        notes: loc.notes,
                    })),
                },
                events: {
                    create: {
                        eventType: 1, // STATUS_CHANGE
                        message: 'Request submitted',
                        actorUserId: createdByUserId,
                    },
                },
            },
            include: {
                locations: true,
                events: true,
            },
        });

        return NextResponse.json(onboardingRequest, { status: 201 });
    } catch (error) {
        console.error('Error creating onboarding request:', error);
        return NextResponse.json(
            { error: 'Failed to create onboarding request' },
            { status: 500 }
        );
    }
}

// GET /api/franchisor/requests - List requests
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const q = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const franchisorId = searchParams.get('franchisorId');

        // Build where clause
        const where: {
            franchisorId?: string;
            status?: number;
            requestType?: number;
            OR?: { contactName?: { contains: string }; requestNumber?: { contains: string } }[];
        } = {};

        if (franchisorId) {
            where.franchisorId = franchisorId;
        }

        if (status) {
            const statusNum = REQUEST_STATUS[status as keyof typeof REQUEST_STATUS];
            if (statusNum) where.status = statusNum;
        }

        if (type) {
            const typeNum = REQUEST_TYPE[type as keyof typeof REQUEST_TYPE];
            if (typeNum) where.requestType = typeNum;
        }

        if (q) {
            where.OR = [
                { contactName: { contains: q } },
                { requestNumber: { contains: q } },
            ];
        }

        const [requests, total] = await Promise.all([
            prisma.onboardingRequest.findMany({
                where,
                include: {
                    locations: true,
                    _count: {
                        select: {
                            locations: true,
                            devices: true,
                            documents: true,
                        },
                    },
                },
                orderBy: { submittedAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.onboardingRequest.count({ where }),
        ]);

        // Map status numbers to strings
        const statusMap: Record<number, string> = {
            1: 'SUBMITTED',
            2: 'IN_REVIEW',
            3: 'WAITING_DOCS',
            4: 'APPROVED',
            5: 'SHIPPED',
            6: 'ACTIVE',
            7: 'REJECTED',
        };

        const typeMap: Record<number, string> = {
            1: 'NEW_FRANCHISEE',
            2: 'ADD_LOCATION',
            3: 'DEVICE_CHANGE',
        };

        const mappedRequests = requests.map((req) => ({
            ...req,
            statusLabel: statusMap[req.status],
            typeLabel: typeMap[req.requestType],
        }));

        return NextResponse.json({
            data: mappedRequests,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        console.error('Error listing requests:', error);
        return NextResponse.json(
            { error: 'Failed to list requests' },
            { status: 500 }
        );
    }
}
