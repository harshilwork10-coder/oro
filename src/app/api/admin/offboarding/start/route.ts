import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/offboarding/start - Start offboarding (suspend account + create case)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { accountType, accountId, reason, graceDays, retentionYears } = body;

        if (!accountType || !accountId) {
            return NextResponse.json({ error: 'accountType and accountId are required' }, { status: 400 });
        }

        // Validate account type
        if (!['BRAND_FRANCHISOR', 'FRANCHISE', 'MULTI_LOCATION'].includes(accountType)) {
            return NextResponse.json({ error: 'Invalid accountType' }, { status: 400 });
        }

        // Check if active offboarding case already exists (CRITICAL RULE #2)
        const existingCase = await (prisma as any).offboardingCase.findFirst({
            where: {
                OR: [
                    { franchisorId: accountType !== 'FRANCHISE' ? accountId : undefined },
                    { franchiseId: accountType === 'FRANCHISE' ? accountId : undefined }
                ],
                status: { not: 'ARCHIVED' }
            }
        });

        if (existingCase) {
            return NextResponse.json({
                error: 'Active offboarding case already exists',
                caseId: existingCase.id
            }, { status: 409 });
        }

        // Create offboarding case and suspend account in transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create offboarding case
            const offboardingCase = await tx.offboardingCase.create({
                data: {
                    accountType,
                    franchisorId: accountType !== 'FRANCHISE' ? accountId : null,
                    franchiseId: accountType === 'FRANCHISE' ? accountId : null,
                    status: 'SUSPENDED',
                    reason: reason || null,
                    requestedByUserId: null, // Provider-initiated
                    approvedByProviderUserId: session.user.id,
                    suspendedAt: new Date(),
                    graceDays: graceDays || 30,
                    retentionYears: retentionYears || 7
                }
            });

            // 2. Suspend the account
            if (accountType === 'FRANCHISE') {
                await tx.franchise.update({
                    where: { id: accountId },
                    data: {
                        accountStatus: 'SUSPENDED',
                        suspendedAt: new Date(),
                        suspendedReason: reason || 'Offboarding initiated'
                    }
                });
            } else {
                await tx.franchisor.update({
                    where: { id: accountId },
                    data: {
                        accountStatus: 'SUSPENDED',
                        suspendedAt: new Date(),
                        suspendedReason: reason || 'Offboarding initiated'
                    }
                });
            }

            return offboardingCase;
        });

        return NextResponse.json({
            success: true,
            message: 'Offboarding started - account suspended',
            case: result,
            scheduledAnonymization: new Date(Date.now() + (result.graceDays * 24 * 60 * 60 * 1000))
        });

    } catch (error) {
        console.error('Offboarding start error:', error);
        return NextResponse.json({ error: 'Failed to start offboarding' }, { status: 500 });
    }
}

// GET /api/admin/offboarding/start?accountType=X&accountId=Y - Get offboarding status
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const accountType = searchParams.get('accountType');
        const accountId = searchParams.get('accountId');

        if (!accountType || !accountId) {
            return NextResponse.json({ error: 'accountType and accountId required' }, { status: 400 });
        }

        const offboardingCase = await (prisma as any).offboardingCase.findFirst({
            where: {
                OR: [
                    { franchisorId: accountType !== 'FRANCHISE' ? accountId : undefined },
                    { franchiseId: accountType === 'FRANCHISE' ? accountId : undefined }
                ],
                status: { not: 'ARCHIVED' }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!offboardingCase) {
            return NextResponse.json({
                status: 'ACTIVE',
                message: 'No offboarding case found'
            });
        }

        const scheduledAnonymization = new Date(
            offboardingCase.startedAt.getTime() + (offboardingCase.graceDays * 24 * 60 * 60 * 1000)
        );

        return NextResponse.json({
            case: offboardingCase,
            scheduledAnonymization,
            canAnonymize: new Date() >= scheduledAnonymization && !offboardingCase.hasOpenChargebacks && !offboardingCase.hasPendingSettlements
        });

    } catch (error) {
        console.error('Offboarding status error:', error);
        return NextResponse.json({ error: 'Failed to get offboarding status' }, { status: 500 });
    }
}
