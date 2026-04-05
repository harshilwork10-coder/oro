import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tobacco-scan/export/[batchId]  — Get batch details + event summary
 * PUT /api/tobacco-scan/export/[batchId]  — Update batch status (SUBMITTED, PAID, REJECTED)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const batch = await prisma.tobaccoScanExportBatch.findFirst({
      where: {
        id: params.batchId,
        franchiseId: user.franchiseId,
      },
      include: {
        events: {
          orderBy: { soldAt: 'asc' },
          select: {
            id: true,
            upc: true,
            qty: true,
            packOrCarton: true,
            regularPrice: true,
            discountApplied: true,
            reimbursementExpected: true,
            claimStatus: true,
            soldAt: true,
            storeId: true,
            tobaccoDeal: {
              select: {
                dealName: true,
                manufacturer: true,
                type: true,
              },
            },
          },
        },
        _count: { select: { events: true } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('[TOBACCO_BATCH_GET]', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, paidAmount, rejectionReason } = body

    if (!status) {
      return NextResponse.json({ error: 'status required' }, { status: 400 })
    }

    const validTransitions: Record<string, string[]> = {
      GENERATED: ['SUBMITTED'],
      SUBMITTED: ['ACKNOWLEDGED', 'PAID', 'REJECTED'],
      ACKNOWLEDGED: ['PAID', 'REJECTED'],
      REJECTED: ['SUBMITTED'], // Can re-submit after rejection
    }

    const batch = await prisma.tobaccoScanExportBatch.findFirst({
      where: { id: params.batchId, franchiseId: user.franchiseId },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const allowed = validTransitions[batch.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${batch.status} to ${status}. Allowed: ${allowed.join(', ')}`,
      }, { status: 400 })
    }

    // Build update data
    const updateData: any = { status }

    if (status === 'SUBMITTED') {
      updateData.submittedAt = new Date()
    }

    if (status === 'PAID') {
      updateData.paidAt = new Date()
      if (paidAmount !== undefined) {
        updateData.paidAmount = paidAmount
      }
    }

    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason
    }

    // Update batch and propagate status to events
    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.tobaccoScanExportBatch.update({
        where: { id: params.batchId },
        data: updateData,
      })

      // Map batch status to event claim status
      const claimStatusMap: Record<string, string> = {
        SUBMITTED: 'SUBMITTED',
        PAID: 'PAID',
        REJECTED: 'DENIED',
      }

      const newClaimStatus = claimStatusMap[status]
      if (newClaimStatus) {
        await tx.tobaccoScanEvent.updateMany({
          where: { exportBatchId: params.batchId },
          data: { claimStatus: newClaimStatus },
        })
      }

      return updatedBatch
    })

    return NextResponse.json({ batch: result })
  } catch (error) {
    console.error('[TOBACCO_BATCH_PUT]', error)
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
  }
}
