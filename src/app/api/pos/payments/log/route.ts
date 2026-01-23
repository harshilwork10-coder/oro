import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/pos/payments/log
 * Log payment attempts for dispute resolution and reconciliation
 * 
 * States:
 * - SENT: Payment request sent to terminal
 * - APPROVED: Terminal returned approved
 * - DECLINED: Terminal returned declined
 * - UNKNOWN: TCP dropped, status unclear (needs reconciliation)
 * - ERROR: Terminal error
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            transactionId,  // Idempotency key
            status,         // SENT, APPROVED, DECLINED, UNKNOWN, ERROR
            amount,         // Amount in cents
            authCode,       // Authorization code from processor
            cardLast4,      // Last 4 digits (masked)
            cardBrand,      // VISA, MASTERCARD, etc.
            terminalId,     // PAX terminal identifier
            reason,         // Decline reason or error message
            stationId,
            locationId
        } = body;

        if (!transactionId || !status) {
            return NextResponse.json({
                error: 'transactionId and status are required'
            }, { status: 400 });
        }

        // Validate status
        const validStatuses = ['SENT', 'APPROVED', 'DECLINED', 'UNKNOWN', 'ERROR', 'VOIDED', 'REFUNDED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            }, { status: 400 });
        }

        // Get user's location if not provided
        let resolvedLocationId = locationId;
        if (!resolvedLocationId) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { locationId: true }
            });
            resolvedLocationId = user?.locationId;
        }

        // Create or update payment log
        const paymentLog = await prisma.paymentLog.upsert({
            where: { transactionId },
            create: {
                transactionId,
                status,
                amount: amount ? parseInt(amount) : null,
                authCode,
                cardLast4,
                cardBrand,
                terminalId,
                reason,
                stationId,
                locationId: resolvedLocationId,
                userId: session.user.id,
                createdAt: new Date()
            },
            update: {
                status,
                authCode: authCode || undefined,
                cardLast4: cardLast4 || undefined,
                cardBrand: cardBrand || undefined,
                reason: reason || undefined,
                updatedAt: new Date()
            }
        });

        // If status is UNKNOWN, create an alert for reconciliation
        if (status === 'UNKNOWN') {
            await prisma.systemAlert.create({
                data: {
                    type: 'PAYMENT_RECONCILIATION',
                    severity: 'HIGH',
                    title: 'Payment Status Unknown',
                    message: `Transaction ${transactionId} needs reconciliation. Amount: $${(amount / 100).toFixed(2)}`,
                    locationId: resolvedLocationId,
                    metadata: { transactionId, amount, terminalId },
                    createdAt: new Date()
                }
            }).catch(() => {
                // Alert creation is optional, don't fail the request
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: paymentLog.id,
                transactionId: paymentLog.transactionId,
                status: paymentLog.status
            }
        });

    } catch (error) {
        console.error('Payment log error:', error);
        return NextResponse.json(
            { error: 'Failed to log payment' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/pos/payments/log
 * Get payment logs for reconciliation (manager/admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status');  // Filter by status
        const transactionId = searchParams.get('transactionId');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build where clause
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (transactionId) {
            where.transactionId = transactionId;
        }

        // Get user's location for filtering
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { locationId: true, role: true }
        });

        // Non-admin users can only see their location's logs
        if (user?.role !== 'ADMIN' && user?.role !== 'PROVIDER' && user?.locationId) {
            where.locationId = user.locationId;
        }

        const logs = await prisma.paymentLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: logs.map(log => ({
                id: log.id,
                transactionId: log.transactionId,
                status: log.status,
                amount: log.amount,
                authCode: log.authCode,
                cardLast4: log.cardLast4,
                cardBrand: log.cardBrand,
                terminalId: log.terminalId,
                reason: log.reason,
                userName: log.user?.name,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt
            }))
        });

    } catch (error) {
        console.error('Payment log fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payment logs' },
            { status: 500 }
        );
    }
}
