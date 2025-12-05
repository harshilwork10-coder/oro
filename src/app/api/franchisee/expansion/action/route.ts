import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Franchisor approves or rejects an expansion request
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized - Franchisor only' }, { status: 401 })
        }

        const { requestId, action, responseNotes } = await req.json()

        if (!requestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        }

        // Get the request and verify franchisor owns the franchise
        const request = await prisma.expansionRequest.findUnique({
            where: { id: requestId },
            include: {
                franchise: { include: { franchisor: true } },
                franchisee: true
            }
        })

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Verify ownership
        if (request.franchise.franchisor.ownerId !== session.user.id) {
            return NextResponse.json({
                error: 'You do not own this franchise'
            }, { status: 403 })
        }

        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        // Update request status
        await prisma.expansionRequest.update({
            where: { id: requestId },
            data: {
                status: newStatus,
                responseNotes
            }
        })

        // If approved, create the new location for the franchisee
        if (action === 'APPROVE') {
            const slug = request.proposedName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')

            const location = await prisma.location.create({
                data: {
                    name: request.proposedName,
                    slug: `${slug}-${Date.now()}`,
                    address: request.proposedAddress,
                    franchiseId: request.franchiseId,
                    ownerId: request.franchiseeId // Assign to the franchisee
                }
            })

            console.log(`[Expansion Approved] Created ${request.proposedName} for ${request.franchisee.name}`)

            return NextResponse.json({
                success: true,
                message: 'Expansion request approved! New location created.',
                location
            })
        }

        console.log(`[Expansion Rejected] ${request.proposedName} by ${request.franchisee.name}`)

        return NextResponse.json({
            success: true,
            message: 'Expansion request rejected.'
        })

    } catch (error) {
        console.error('Error processing expansion request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
