import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'

// DELETE - Delete/deactivate a franchisor account
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Soft delete: deactivate the franchisor
        await prisma.franchise.update({
            where: { id: params.id },
            data: { accountStatus: 'SUSPENDED' }
        })

        // Audit log
        await auditLog({
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
