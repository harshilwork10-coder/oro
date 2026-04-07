import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tobacco-scan/submissions
 *
 * Returns export batches from TobaccoScanExportBatch model.
 * Gracefully returns empty array if table doesn't exist yet.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let submissions: any[] = []
        try {
            const batches = await prisma.tobaccoScanExportBatch.findMany({
                where: { franchiseId: user.franchiseId },
                include: {
                    _count: { select: { events: true } },
                },
                orderBy: { weekStart: 'desc' },
                take: 20,
            })

            // Map to legacy submission format for backward compatibility
            submissions = batches.map(batch => ({
                id: batch.id,
                franchiseId: batch.franchiseId,
                manufacturer: batch.manufacturer,
                weekStartDate: batch.weekStart,
                weekEndDate: batch.weekEnd,
                recordCount: batch.eventCount,
                totalAmount: Number(batch.totalReimbursement),
                status: batch.status === 'GENERATED' ? 'PENDING' :
                        batch.status === 'SUBMITTED' ? 'SUBMITTED' :
                        batch.status === 'PAID' ? 'CONFIRMED' :
                        batch.status,
                submittedAt: batch.submittedAt,
                confirmedAt: batch.paidAt,
                fileUrl: null,
                notes: batch.exportFileName,
                createdAt: batch.createdAt,
                updatedAt: batch.updatedAt,
            }))
        } catch (dbErr: any) {
            // Table may not exist yet — return empty
            console.warn('[TOBACCO_SUBMISSIONS] DB query failed (table may not exist):', dbErr?.message)
        }

        return NextResponse.json({ submissions })
    } catch (error) {
        console.error('[TOBACCO_SUBMISSIONS]', error)
        return NextResponse.json({ submissions: [] })
    }
}
