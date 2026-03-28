import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email || (user.role !== 'ADMIN' && user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { franchisorId, action } = body // action: 'APPROVE' | 'REJECT'

        if (!franchisorId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        // First, fetch the franchisor to check document status
        const existingFranchisor = await prisma.franchisor.findUnique({
            where: { id: franchisorId },
            select: {
                name: true,
                voidCheckUrl: true
            }
        })

        if (!existingFranchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // NOTE: Document validation removed - Provider handles documents directly
        // No longer requiring voidCheckUrl before approval

        // Update Franchisor
        const franchisor = await prisma.franchisor.update({
            where: { id: franchisorId },
            data: { approvalStatus: status },
            include: {
                owner: true,
                franchises: true
            }
        })

        // For MULTI_LOCATION_OWNER: Create parent record so they can add stores
        // NOTE: We do NOT create an actual store here - owner might have different business names
        // They will add their own stores with their own unique names (e.g., "mikes cafe", "mikes pizza")
        if (action === 'APPROVE' && franchisor.businessType === 'MULTI_LOCATION_OWNER' && franchisor.franchises.length === 0) {
            const ownerName = franchisor.name || 'My Business'
            const slug = ownerName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')

            // Create a parent record (required by DB) - the actual stores will be Locations under this
            await prisma.franchise.create({
                data: {
                    name: `${ownerName} Stores`, // Internal name, not shown to owner
                    slug: `${slug}-stores-${Date.now()}`,
                    franchisorId: franchisor.id
                }
            })
        }

        // In production: Send email notification

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: user.role || 'PROVIDER',
            action: `FRANCHISOR_${action}`,
            entityType: 'Franchisor',
            entityId: franchisorId,
            metadata: { franchisorName: existingFranchisor.name, businessType: franchisor.businessType }
        })

        return NextResponse.json({ success: true, franchisor })

    } catch (error) {
        console.error('Error approving franchisor:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

