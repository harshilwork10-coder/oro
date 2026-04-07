// Route Handler for provider provisioning tasks

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'

// GET /api/provider/provisioning-tasks - List provisioning tasks for Provider
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is PROVIDER
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get('status');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {};
        if (statusFilter) {
            const statuses = statusFilter.split(',');
            whereClause.status = { in: statuses };
        }

        const tasks = await prisma.locationProvisioningTask.findMany({
            where: whereClause,
            include: {
                location: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        provisioningStatus: true,
                        _count: { select: { stations: true } }
                    }
                },
                franchisor: {
                    select: {
                        id: true,
                        name: true,
                        owner: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get franchisee names
        const franchiseIds = [...new Set(tasks.map(t => t.franchiseeBusinessId))] as string[];
        const franchises = await prisma.franchise.findMany({
            where: { id: { in: franchiseIds } },
            select: { id: true, name: true }
        });
        const franchiseMap = Object.fromEntries(franchises.map(f => [f.id, f.name]));

        const data = tasks.map(task => ({
            id: task.id,
            locationId: task.locationId,
            locationName: task.location.name,
            locationAddress: task.location.address,
            locationStatus: task.location.provisioningStatus,
            stationCount: task.location._count.stations,
            franchisorId: task.franchisorId,
            franchisorName: task.franchisor.name || task.franchisor.owner?.name || 'Unknown',
            franchiseeId: task.franchiseeBusinessId,
            franchiseeName: franchiseMap[task.franchiseeBusinessId] || 'Unknown',
            requestedDevicesCount: task.requestedDevicesCount,
            notes: task.notes,
            status: task.status,
            assignedToUserId: task.assignedToUserId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[PROVIDER_PROVISIONING_TASKS]', error?.message?.slice(0, 120))
        return NextResponse.json({ data: [] })
    }
}
