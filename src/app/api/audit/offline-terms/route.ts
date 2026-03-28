import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/mobileAuth';
import { prisma } from '@/lib/prisma'

// POST - Log audit events for offline mode
export async function POST(req: NextRequest) {
    try {
        ;
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, storeName, ownerName, timestamp, termsVersion, details } = body;

        // Log to audit table
        const auditLog = await prisma.auditLog.create({
            data: {
                action,
                entityType: 'OFFLINE_MODE',
                entityId: storeName || 'unknown',
                userId: user.id,
                changes: JSON.stringify({
                    storeName,
                    ownerName,
                    termsVersion,
                    timestamp,
                    userAgent: req.headers.get('user-agent'),
                    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                    ...details
                })
            }
        });

        // Debug log removed;

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
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        // Only providers can view audit logs
        if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
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

