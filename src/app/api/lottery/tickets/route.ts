import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Save a new ticket barcode-to-price mapping
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { barcode, price } = await request.json()

        if (!barcode || !price) {
            return NextResponse.json({ error: 'Barcode and price are required' }, { status: 400 })
        }

        // Check if barcode already exists for this franchise
        const existing = await prisma.scratchTicket.findFirst({
            where: {
                franchiseId: user.franchiseId,
                barcode
            }
        })

        if (existing) {
            // Update the price
            await prisma.scratchTicket.update({
                where: { id: existing.id },
                data: { price }
            })
            return NextResponse.json({ message: 'Ticket price updated', updated: true })
        }

        // Create new ticket mapping
        const ticket = await prisma.scratchTicket.create({
            data: {
                franchiseId: user.franchiseId,
                barcode,
                price
            }
        })

        return NextResponse.json({ ticket, message: 'Ticket saved successfully' })

    } catch (error) {
        console.error('Save ticket error:', error)
        return NextResponse.json({ error: 'Failed to save ticket' }, { status: 500 })
    }
}

// Get all saved tickets for this franchise
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const tickets = await prisma.scratchTicket.findMany({
            where: {
                franchiseId: user.franchiseId
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        return NextResponse.json({ tickets })

    } catch (error) {
        console.error('Get tickets error:', error)
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }
}
