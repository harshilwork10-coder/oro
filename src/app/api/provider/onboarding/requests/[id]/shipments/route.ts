import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/provider/onboarding/requests/[id]/shipments - Create shipment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            shipToLocationId,
            attentionName,
            attentionPhone,
            carrier,
            serviceLevel,
            shipToAddress1,
            shipToAddress2,
            shipToCity,
            shipToState,
            shipToPostalCode,
            shipToCountry = 'USA',
            packages = [],
            notes,
            createdByUserId,
        } = body;

        // Verify request exists
        const onboardingRequest = await prisma.onboardingRequest.findUnique({
            where: { id },
        });

        if (!onboardingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Create shipment
        const shipment = await prisma.shipment.create({
            data: {
                onboardingRequestId: id,
                franchiseId: onboardingRequest.franchiseId,
                locationId: shipToLocationId,
                status: 1, // DRAFT
                carrier,
                serviceLevel,
                shipToName: attentionName,
                shipToPhone: attentionPhone,
                shipToAddress1,
                shipToAddress2,
                shipToCity,
                shipToState,
                shipToPostalCode,
                shipToCountry,
                notes,
                createdByUserId,
                packages: {
                    create: packages.map((pkg: { weight?: number; dims?: { length?: number; width?: number; height?: number }; items?: { itemType?: string; terminalId?: string; serialNumber?: string; sku?: string; itemName: string; qty?: number }[] }, index: number) => ({
                        packageNo: index + 1,
                        weightLb: pkg.weight,
                        lengthIn: pkg.dims?.length,
                        widthIn: pkg.dims?.width,
                        heightIn: pkg.dims?.height,
                    })),
                },
            },
            include: {
                packages: true,
            },
        });

        // Create items for each package
        for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i] as { items?: { itemType?: string; terminalId?: string; serialNumber?: string; sku?: string; itemName: string; qty?: number }[] };
            const createdPackage = shipment.packages[i];
            if (pkg.items && createdPackage) {
                for (const item of pkg.items) {
                    const itemTypeMap: Record<string, number> = { TERMINAL: 1, STATION: 2, ACCESSORY: 3, OTHER: 4 };
                    await prisma.shipmentItem.create({
                        data: {
                            shipmentId: shipment.id,
                            packageId: createdPackage.id,
                            itemType: itemTypeMap[item.itemType || 'OTHER'] || 4,
                            terminalId: item.terminalId,
                            serialNumber: item.serialNumber,
                            sku: item.sku,
                            itemName: item.itemName,
                            qty: item.qty || 1,
                        },
                    });
                }
            }
        }

        // Add timeline event
        await prisma.onboardingRequestEvent.create({
            data: {
                onboardingRequestId: id,
                eventType: 7, // SHIPMENT_CREATED
                message: `Shipment created${carrier ? ` via ${carrier}` : ''}`,
                actorUserId: createdByUserId,
            },
        });

        // Fetch complete shipment
        const fullShipment = await prisma.shipment.findUnique({
            where: { id: shipment.id },
            include: { packages: { include: { items: true } } },
        });

        return NextResponse.json(fullShipment, { status: 201 });
    } catch (error) {
        console.error('Error creating shipment:', error);
        return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
    }
}

// GET /api/provider/onboarding/requests/[id]/shipments - List shipments
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const shipments = await prisma.shipment.findMany({
            where: { onboardingRequestId: id },
            include: {
                packages: { include: { items: true } },
                location: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(shipments);
    } catch (error) {
        console.error('Error listing shipments:', error);
        return NextResponse.json({ error: 'Failed to list shipments' }, { status: 500 });
    }
}
