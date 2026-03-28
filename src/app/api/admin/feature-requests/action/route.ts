import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// POST: Approve or reject a feature request
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { requestId, action } = await req.json()

        if (!requestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Fetch the request
        const featureRequest = await prisma.featureRequest.findUnique({
            where: { id: requestId },
            include: { franchisor: true }
        })

        if (!featureRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Update request status
        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        await prisma.featureRequest.update({
            where: { id: requestId },
            data: { status: newStatus }
        })

        // If approved, update the business config to enable the feature
        if (action === 'APPROVE') {
            const featureKey = featureRequest.featureKey

            // Check if config exists
            const existingConfig = await prisma.businessConfig.findUnique({
                where: { franchisorId: featureRequest.franchisorId }
            })

            if (existingConfig) {
                // Update existing config
                await prisma.businessConfig.update({
                    where: { franchisorId: featureRequest.franchisorId },
                    data: { [featureKey]: true }
                })
            } else {
                // Create new config with this feature enabled
                await prisma.businessConfig.create({
                    data: {
                        franchisorId: featureRequest.franchisorId,
                        [featureKey]: true
                    }
                })
            }
        }

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'PROVIDER',
            action: `FEATURE_REQUEST_${action}`,
            entityType: 'FeatureRequest',
            entityId: requestId,
            metadata: { featureKey: featureRequest.featureKey, franchisorId: featureRequest.franchisorId }
        })

        return NextResponse.json({
            success: true,
            message: action === 'APPROVE'
                ? 'Feature enabled successfully'
                : 'Request rejected'
        })
    } catch (error) {
        console.error('Error processing feature request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

