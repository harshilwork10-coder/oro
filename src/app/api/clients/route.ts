import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST: Create new client
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { firstName, lastName, email, phone, franchiseId } = body

        if (!firstName || !lastName || !franchiseId) {
            return NextResponse.json(
                { error: 'First name, last name, and franchise ID are required' },
                { status: 400 }
            )
        }

        // Security: Verify user owns this franchise
        const user = session.user as any
        if (franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const client = await prisma.client.create({
            data: {
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                franchiseId,
            },
        })

        return NextResponse.json(client, { status: 201 })
    } catch (error) {
        console.error('Error creating client:', error)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }
}
