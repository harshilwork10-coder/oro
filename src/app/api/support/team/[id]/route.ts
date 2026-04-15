import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// DELETE - Remove a support team member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id } = await params
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
// Verify the user belongs to this franchise
        const teamMember = await prisma.user.findFirst({
            where: {
                id,
                franchiseId: user.franchiseId,
                role: 'SUPPORT_STAFF'
            }
        })

        if (!teamMember) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
        }

        // Delete the user
        await prisma.user.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[SUPPORT_TEAM_DELETE]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
