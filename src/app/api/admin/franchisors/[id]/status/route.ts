import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/franchisors/[id]/status
 * Update account status (suspend, terminate, reactivate)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can update account status
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { accountStatus, reason } = body

        // Validate status
        const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'TERMINATED']
        if (!accountStatus || !validStatuses.includes(accountStatus)) {
            return NextResponse.json({
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            }, { status: 400 })
        }

        // Build update data
        const updateData: any = {
            accountStatus,
        }

        // Add suspension metadata if suspending
        if (accountStatus === 'SUSPENDED') {
            updateData.suspendedAt = new Date()
            updateData.suspendedReason = reason || 'Suspended by provider'
        }

        // Clear suspension data if reactivating
        if (accountStatus === 'ACTIVE') {
            updateData.suspendedAt = null
            updateData.suspendedReason = null
        }

        // Update the franchisor
        const updated = await prisma.franchisor.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                accountStatus: true,
                suspendedAt: true,
                suspendedReason: true
            }
        })

        return NextResponse.json({
            success: true,
            message: `Account ${accountStatus.toLowerCase()}`,
            franchisor: updated
        })

    } catch (error) {
        console.error('Error updating account status:', error)
        return NextResponse.json(
            { error: 'Failed to update account status' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/admin/franchisors/[id]/status
 * Get current account status
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            select: {
                id: true,
                accountStatus: true,
                approvalStatus: true,
                suspendedAt: true,
                suspendedReason: true
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        return NextResponse.json(franchisor)

    } catch (error) {
        console.error('Error getting account status:', error)
        return NextResponse.json(
            { error: 'Failed to get account status' },
            { status: 500 }
        )
    }
}
