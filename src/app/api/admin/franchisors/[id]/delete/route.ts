import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
            data: { status: 'SUSPENDED' }
        })

        return NextResponse.json({ success: true, message: 'Franchisor deactivated' })
    } catch (error) {
        console.error('[FRANCHISOR_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete franchisor' }, { status: 500 })
    }
}
