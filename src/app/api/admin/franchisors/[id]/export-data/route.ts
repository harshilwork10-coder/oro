import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET - Export all franchisor data as JSON (backup/audit)
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchise = await prisma.franchise.findUnique({
            where: { id: params.id },
            include: {
                locations: true,
                employees: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                products: { take: 100 }
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        const exportData = JSON.stringify(franchise, null, 2)
        return new NextResponse(exportData, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${franchise.businessName || 'export'}_data.json"`
            }
        })
    } catch (error) {
        console.error('[FRANCHISOR_EXPORT]', error)
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }
}
