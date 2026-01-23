import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/offboarding/anonymize - Anonymize PII (after grace period)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { caseId, forceAnonymize } = body;

        if (!caseId) {
            return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
        }

        const offboardingCase = await (prisma as any).offboardingCase.findUnique({
            where: { id: caseId }
        });

        if (!offboardingCase) {
            return NextResponse.json({ error: 'Offboarding case not found' }, { status: 404 });
        }

        // Must be in OFFBOARDING_EXPORT status
        if (offboardingCase.status !== 'OFFBOARDING_EXPORT') {
            return NextResponse.json({
                error: 'Export must be completed before anonymization',
                currentStatus: offboardingCase.status
            }, { status: 400 });
        }

        // Check grace period (CRITICAL RULE)
        const scheduledAnonymization = new Date(
            offboardingCase.startedAt.getTime() + (offboardingCase.graceDays * 24 * 60 * 60 * 1000)
        );

        if (new Date() < scheduledAnonymization && !forceAnonymize) {
            return NextResponse.json({
                error: 'Grace period not yet elapsed',
                scheduledAnonymization,
                daysRemaining: Math.ceil((scheduledAnonymization.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            }, { status: 400 });
        }

        // Check financial obligations (CRITICAL RULE #4)
        if (offboardingCase.hasOpenChargebacks || offboardingCase.hasPendingSettlements) {
            return NextResponse.json({
                error: 'Cannot anonymize with pending financial obligations',
                hasOpenChargebacks: offboardingCase.hasOpenChargebacks,
                hasPendingSettlements: offboardingCase.hasPendingSettlements
            }, { status: 400 });
        }

        const accountId = offboardingCase.franchisorId || offboardingCase.franchiseId;
        const isFranchise = !!offboardingCase.franchiseId;

        // Anonymize PII (CRITICAL RULE #3: Never anonymize transaction totals/amounts)
        await prisma.$transaction(async (tx: any) => {
            if (isFranchise) {
                // Anonymize franchise customers
                await tx.client.updateMany({
                    where: { franchiseId: accountId! },
                    data: {
                        firstName: 'Anonymized',
                        lastName: 'Customer',
                        email: null,
                        phone: null
                    }
                });

                // Anonymize franchise employees (keep name for records, remove PII)
                await tx.user.updateMany({
                    where: { franchiseId: accountId! },
                    data: {
                        email: `archived_${accountId}@anonymized.local`,
                        phone: null
                    }
                });
            } else {
                // Anonymize franchisor members
                const memberships = await tx.franchisorMembership.findMany({
                    where: { franchisorId: accountId! },
                    select: { userId: true }
                });

                for (const m of memberships) {
                    await tx.user.update({
                        where: { id: m.userId },
                        data: {
                            email: `archived_${m.userId}@anonymized.local`,
                            phone: null
                        }
                    });
                }

                // Anonymize all franchise customers under this franchisor
                const franchises = await tx.franchise.findMany({
                    where: { franchisorId: accountId! },
                    select: { id: true }
                });

                for (const f of franchises) {
                    await tx.client.updateMany({
                        where: { franchiseId: f.id },
                        data: {
                            firstName: 'Anonymized',
                            lastName: 'Customer',
                            email: null,
                            phone: null
                        }
                    });
                }
            }

            // Update case status
            await tx.offboardingCase.update({
                where: { id: caseId },
                data: {
                    status: 'OFFBOARDING_ANONYMIZE',
                    anonymizedAt: new Date()
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: 'PII anonymized successfully. Transaction records preserved.',
            anonymizedAt: new Date()
        });

    } catch (error) {
        console.error('Anonymization error:', error);
        return NextResponse.json({ error: 'Failed to anonymize data' }, { status: 500 });
    }
}
