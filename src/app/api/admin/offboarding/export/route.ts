import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/offboarding/export - Generate data export
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

        if (offboardingCase.status !== 'SUSPENDED') {
            return NextResponse.json({
                error: 'Export can only be generated after suspension',
                currentStatus: offboardingCase.status
            }, { status: 400 });
        }

        // Gather export data (CRITICAL RULE #3: Keep transaction data intact)
        const accountId = offboardingCase.franchisorId || offboardingCase.franchiseId;
        const isFranchise = !!offboardingCase.franchiseId;

        let exportData: any = {
            exportedAt: new Date().toISOString(),
            accountType: offboardingCase.accountType,
            accountId
        };

        if (isFranchise) {
            // Export franchise data
            const franchise = await prisma.franchise.findUnique({
                where: { id: accountId! },
                include: {
                    locations: {
                        include: { stations: true }
                    },
                    transactions: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            total: true,
                            subtotal: true,
                            tax: true,
                            paymentMethod: true,
                            status: true,
                            createdAt: true
                        }
                    },
                    clients: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            createdAt: true
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            createdAt: true
                        }
                    }
                }
            });
            exportData.franchise = franchise;
        } else {
            // Export franchisor data
            const franchisor = await prisma.franchisor.findUnique({
                where: { id: accountId! },
                include: {
                    franchises: {
                        include: {
                            locations: true,
                            transactions: {
                                select: {
                                    id: true,
                                    invoiceNumber: true,
                                    total: true,
                                    subtotal: true,
                                    tax: true,
                                    paymentMethod: true,
                                    status: true,
                                    createdAt: true
                                }
                            }
                        }
                    }
                }
            });
            exportData.franchisor = franchisor;
        }

        // In production, you'd save this to S3/cloud storage
        const exportFileUrl = `/api/admin/offboarding/export/${caseId}/download`;
        const exportFileExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await (prisma as any).offboardingCase.update({
            where: { id: caseId },
            data: {
                status: 'OFFBOARDING_EXPORT',
                exportGeneratedAt: new Date(),
                exportFileUrl,
                exportFileExpiresAt
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Export generated successfully',
            exportUrl: exportFileUrl,
            expiresAt: exportFileExpiresAt,
            recordCount: {
                transactions: isFranchise
                    ? exportData.franchise?.transactions?.length || 0
                    : exportData.franchisor?.franchises?.reduce((sum: number, f: any) => sum + (f.transactions?.length || 0), 0) || 0,
                customers: isFranchise ? exportData.franchise?.clients?.length || 0 : 0,
                employees: isFranchise ? exportData.franchise?.users?.length || 0 : 0
            }
        });

    } catch (error) {
        console.error('Export generation error:', error);
        return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
    }
}
