import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Remove a support team member
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any

        // Verify the user belongs to this franchise
        const teamMember = await prisma.user.findFirst({
            where: {
                id: params.id,
                franchiseId: user.franchiseId,
                role: 'SUPPORT_STAFF'
            }
        })

        if (!teamMember) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
        }

        // Delete the user
        await prisma.user.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[SUPPORT_TEAM_DELETE]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
