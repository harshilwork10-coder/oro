import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Log audit events for offline mode
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, storeName, ownerName, timestamp, termsVersion, details } = body;

        // Log to audit table
        const auditLog = await prisma.auditLog.create({
            data: {
                action,
                entityType: 'OFFLINE_MODE',
                entityId: storeName || 'unknown',
                userId: (session.user as any).id,
                changes: JSON.stringify({
                    storeName,
                    ownerName,
                    termsVersion,
                    timestamp,
                    userAgent: request.headers.get('user-agent'),
                    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                    ...details
                })
            }
        });

        console.log(`[Audit] ${action} by ${ownerName} at ${storeName}`);

        return NextResponse.json({
            success: true,
            logId: auditLog.id
        });
    } catch (error: any) {
        console.error('[Audit] Failed to log:', error);
        // Don't fail the request if logging fails
        return NextResponse.json({ success: true, logged: false });
    }
}

// GET - Get offline mode audit logs for a store
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        // Only providers can view audit logs
        if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId');
        const limit = parseInt(searchParams.get('limit') || '100');

        const logs = await prisma.auditLog.findMany({
            where: {
                entityType: 'OFFLINE_MODE',
                ...(storeId && { entityId: storeId })
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json({
            logs: logs.map((log: typeof logs[number]) => ({
                id: log.id,
                action: log.action,
                storeId: log.entityId,
                userId: log.userId,
                details: JSON.parse(log.changes || '{}'),
                createdAt: log.createdAt
            }))
        });
    } catch (error: any) {
        console.error('[Audit] Failed to fetch logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

