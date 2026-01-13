import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || (session.user.role !== 'ADMIN' && session.user.role !== 'PROVIDER')) {
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
                voidCheckUrl: true,
                driverLicenseUrl: true,
                feinLetterUrl: true,
                needToDiscussProcessing: true
            }
        })

        if (!existingFranchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Validation: For APPROVE action, check that documents are uploaded
        if (action === 'APPROVE') {
            const missingFields: string[] = []

            // Only check documents
            if (!existingFranchisor.driverLicenseUrl) missingFields.push('Driver License')
            if (!existingFranchisor.voidCheckUrl) missingFields.push('Voided Check')

            // If they didn't mark "discuss processing", they should upload FEIN
            if (!existingFranchisor.needToDiscussProcessing && !existingFranchisor.feinLetterUrl) {
                missingFields.push('FEIN Letter')
            }

            if (missingFields.length > 0) {
                return NextResponse.json({
                    error: 'Cannot approve - documents incomplete',
                    missingFields,
                    canSendReminder: true,
                    message: `Client has not uploaded required documents: ${missingFields.join(', ')}`
                }, { status: 400 })
            }
        }

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

        return NextResponse.json({ success: true, franchisor })

    } catch (error) {
        console.error('Error approving franchisor:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

