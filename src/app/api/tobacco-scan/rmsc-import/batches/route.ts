/**
 * RMSC Import Batches List
 *
 * GET /api/tobacco-scan/rmsc-import/batches
 */

import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.franchiseId) return NextResponse.json({ error: 'No franchise' }, { status: 400 })

        // Get locations for this franchise
        const locations = await prisma.location.findMany({
            where: { franchise: { id: user.franchiseId } },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        const batches = await prisma.rmscImportBatch.findMany({
            where: { locationId: { in: locationIds } },
            orderBy: { importedAt: 'desc' },
            take: 20,
        })

        return NextResponse.json({
            batches: batches.map(b => ({
                id: b.id,
                fileName: b.fileName,
                fileType: b.fileType,
                importedAt: b.importedAt.toISOString(),
                status: b.status,
                totalRows: b.totalRows,
                importedRows: b.importedRows,
                duplicateRows: b.duplicateRows,
                errorRows: b.errorRows,
            }))
        })
    } catch (error) {
        console.error('[RMSC_BATCHES]', error)
        return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
    }
}
