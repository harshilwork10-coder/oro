/**
 * HQ Alerts API
 * 
 * SCOPE ENFORCEMENT:
 * - FRANCHISOR role: User owns a Franchisor (brand) → sees alerts for all franchises
 * - OWNER role: User has franchiseId → sees alerts for that franchise only
 * - PROVIDER role: Should NOT access this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { id: string; role: string };

        // PROVIDER should use /provider/reports
        if (user.role === 'PROVIDER') {
            return NextResponse.json({ error: 'Use /api/provider/reports for platform admin access' }, { status: 403 });
        }

        if (!['FRANCHISOR', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get scope
        let franchiseIds: string[] = [];

        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: user.id },
                include: { franchises: { select: { id: true } } }
            });
            if (!franchisor) {
                return NextResponse.json({ alerts: [], message: 'No brand found' });
            }
            franchiseIds = franchisor.franchises.map(f => f.id);
        } else {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { franchiseId: true }
            });
            if (dbUser?.franchiseId) {
                franchiseIds = [dbUser.franchiseId];
            }
        }

        if (franchiseIds.length === 0) {
            return NextResponse.json({ alerts: [] });
        }

        const alerts: { type: string; severity: string; message: string; locationName?: string }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get locations for these franchises
        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: { id: true, name: true, franchiseId: true, provisioningStatus: true }
        });

        // Check each location for issues
        for (const loc of locations) {
            // Zero sales today
            const todaySales = await prisma.transaction.count({
                where: {
                    franchiseId: loc.franchiseId,
                    createdAt: { gte: today },
                    status: 'COMPLETED'
                }
            });

            if (todaySales === 0 && loc.provisioningStatus === 'ACTIVE') {
                alerts.push({
                    type: 'ZERO_SALES',
                    severity: 'warning',
                    message: 'No sales today',
                    locationName: loc.name
                });
            }

            // High refund rate
            const [completedCount, refundedCount] = await Promise.all([
                prisma.transaction.count({
                    where: { franchiseId: loc.franchiseId, createdAt: { gte: today }, status: 'COMPLETED' }
                }),
                prisma.transaction.count({
                    where: { franchiseId: loc.franchiseId, createdAt: { gte: today }, status: 'REFUNDED' }
                })
            ]);

            if (completedCount > 0 && refundedCount / completedCount > 0.15) {
                alerts.push({
                    type: 'HIGH_REFUNDS',
                    severity: 'critical',
                    message: `High refund rate: ${Math.round((refundedCount / completedCount) * 100)}%`,
                    locationName: loc.name
                });
            }
        }

        return NextResponse.json({ alerts });
    } catch (error) {
        console.error('[HQ Alerts] Error:', error);
        return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
    }
}
