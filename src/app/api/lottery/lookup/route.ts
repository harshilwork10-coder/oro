import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Lookup a scratch ticket by barcode (for POS auto-fill)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 })
        }

        // First try exact match
        let ticket = await prisma.scratchTicket.findFirst({
            where: {
                franchiseId: user.franchiseId,
                barcode: code
            }
        })

        // If not found, try partial match (last 6 digits)
        if (!ticket && code.length >= 6) {
            ticket = await prisma.scratchTicket.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    barcode: {
                        endsWith: code.slice(-6)
                    }
                }
            })
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
        }

        return NextResponse.json({
            gameName: ticket.name || 'Scratch Ticket',
            ticketPrice: Number(ticket.price),
            barcode: ticket.barcode
        })

    } catch (error) {
        console.error('Lookup ticket error:', error)
        return NextResponse.json({ error: 'Failed to lookup ticket' }, { status: 500 })
    }
}
