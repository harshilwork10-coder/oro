/**
 * RMSC Import Batches List
 *
 * GET /api/tobacco-scan/rmsc-import/batches
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })
        if (!user?.franchiseId) return ApiResponse.badRequest('No franchise')

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

        return ApiResponse.success({
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
        return ApiResponse.error('Failed to fetch import batches', 500)
    }
}
