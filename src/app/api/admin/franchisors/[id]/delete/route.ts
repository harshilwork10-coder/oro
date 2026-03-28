import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { logActivity } from '@/lib/auditLog'

// DELETE - Delete/deactivate a franchisor account
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Soft delete: deactivate the franchisor
        await prisma.franchise.update({
            where: { id: params.id },
            data: { accountStatus: 'SUSPENDED' }
        })

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: 'PROVIDER',
            action: 'FRANCHISOR_DELETE',
            entityType: 'Franchise',
            entityId: params.id,
            metadata: { softDelete: true }
        })

        return NextResponse.json({ success: true, message: 'Franchisor deactivated' })
    } catch (error) {
        console.error('[FRANCHISOR_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete franchisor' }, { status: 500 })
    }
}
