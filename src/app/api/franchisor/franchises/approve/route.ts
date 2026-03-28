import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email || user.role !== 'FRANCHISOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { franchiseId, action } = body // action: 'APPROVE' | 'REJECT'

        if (!franchiseId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify ownership
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            include: { franchisor: true }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        if (franchise.franchisor.ownerId !== user.id) {
            return NextResponse.json({ error: 'Unauthorized access to this franchise' }, { status: 403 })
        }

        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        // Update Franchise
        const updatedFranchise = await prisma.franchise.update({
            where: { id: franchiseId },
            data: { approvalStatus: status }
        })

        return NextResponse.json({ success: true, franchise: updatedFranchise })

    } catch (error) {
        console.error('Error approving franchise:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

