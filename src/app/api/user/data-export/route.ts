/**
 * User Data Export API Route
 * GDPR Article 20 - Right to Data Portability
 */

import { NextResponse } from 'next/server'
import { exportUserData } from '@/lib/security/gdpr'
import { logActivity } from '@/lib/auditLog'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = user.id

        // Export user data
        const exportData = await exportUserData(userId)

        // Log the export request
        await logActivity({
            userId,
            action: 'DATA_EXPORT_REQUEST',
            entityType: 'USER',
            entityId: userId,
            details: {
                success: true,
                timestamp: new Date().toISOString()
            }
        })

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="my-data-export-${new Date().toISOString().split('T')[0]}.json"`
            }
        })

    } catch (error) {
        console.error('[Data Export] Error:', error)
        return NextResponse.json(
            { error: 'Failed to export data' },
            { status: 500 }
        )
    }
}

