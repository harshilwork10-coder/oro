'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/provider/provisioning-tasks/:id - Get single provisioning task
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const { id } = await params;

    const task = await prisma.locationProvisioningTask.findUnique({
        where: { id },
        include: {
            location: {
                include: {
                    stations: true,
                    franchise: { select: { id: true, name: true } }
                }
            },
            franchisor: {
                select: {
                    id: true,
                    name: true,
                    owner: { select: { name: true, email: true } }
                }
            }
        }
    });

    if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: task });
}

// PATCH /api/provider/provisioning-tasks/:id - Update provisioning task status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'PROVIDER') {
        return NextResponse.json({ error: 'Provider access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, assignedToUserId } = body;

    // Get current task
    const task = await prisma.locationProvisioningTask.findUnique({
        where: { id },
        include: {
            location: {
                include: { stations: true }
            }
        }
    });

    if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Validation: Cannot mark DONE unless stations exist
    if (status === 'DONE' && task.location.stations.length === 0) {
        return NextResponse.json({
            error: 'Cannot mark as DONE - no stations have been created for this location'
        }, { status: 400 });
    }

    // Update task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId;

    const updatedTask = await prisma.locationProvisioningTask.update({
        where: { id },
        data: updateData
    });

    // If marked DONE, update location status to READY_FOR_INSTALL
    if (status === 'DONE') {
        await prisma.location.update({
            where: { id: task.locationId },
            data: { provisioningStatus: 'READY_FOR_INSTALL' }
        });
    }

    // If marked IN_PROGRESS, assign to current user if not assigned
    if (status === 'IN_PROGRESS' && !task.assignedToUserId) {
        await prisma.locationProvisioningTask.update({
            where: { id },
            data: { assignedToUserId: session.user.id }
        });
    }

    return NextResponse.json({
        success: true,
        task: updatedTask,
        message: status === 'DONE' ? 'Task completed. Location is now READY_FOR_INSTALL.' : 'Task updated.'
    });
}
