import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/offboarding/archive - Mark as archived (final stage)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { caseId } = body;

        if (!caseId) {
            return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
        }

        const offboardingCase = await (prisma as any).offboardingCase.findUnique({
            where: { id: caseId }
        });

        if (!offboardingCase) {
            return NextResponse.json({ error: 'Offboarding case not found' }, { status: 404 });
        }

        // Must be in OFFBOARDING_ANONYMIZE status (cannot skip)
        if (offboardingCase.status !== 'OFFBOARDING_ANONYMIZE') {
            return NextResponse.json({
                error: 'Anonymization must be completed before archiving',
                currentStatus: offboardingCase.status
            }, { status: 400 });
        }

        const accountId = offboardingCase.franchisorId || offboardingCase.franchiseId;
        const isFranchise = !!offboardingCase.franchiseId;

        await prisma.$transaction(async (tx: any) => {
            // Update case to ARCHIVED
            await tx.offboardingCase.update({
                where: { id: caseId },
                data: {
                    status: 'ARCHIVED',
                    archivedAt: new Date()
                }
            });

            // Update account status to ARCHIVED
            if (isFranchise) {
                await tx.franchise.update({
                    where: { id: accountId! },
                    data: {
                        accountStatus: 'ARCHIVED',
                        deletedAt: new Date()
                    }
                });
            } else {
                await tx.franchisor.update({
                    where: { id: accountId! },
                    data: {
                        accountStatus: 'ARCHIVED'
                    }
                });
            }
        });

        // Calculate retention end date
        const retentionEndDate = new Date();
        retentionEndDate.setFullYear(retentionEndDate.getFullYear() + offboardingCase.retentionYears);

        return NextResponse.json({
            success: true,
            message: 'Account archived successfully. Transaction data retained for compliance.',
            archivedAt: new Date(),
            retentionYears: offboardingCase.retentionYears,
            dataRetainedUntil: retentionEndDate
        });

    } catch (error) {
        console.error('Archive error:', error);
        return NextResponse.json({ error: 'Failed to archive account' }, { status: 500 });
    }
}
