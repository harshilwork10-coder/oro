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

            console.log(`[Auto-Setup] Created parent record for ${ownerName} - they can now add stores`)
        }

        // Mock Email Notification
        console.log(`[Email Mock] Sending ${status} email to ${franchisor.owner.email}`)

        return NextResponse.json({ success: true, franchisor })

    } catch (error) {
        console.error('Error approving franchisor:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

