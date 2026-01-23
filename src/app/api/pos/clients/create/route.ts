import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// POST /api/pos/clients - Create a new client (mobile-ready)
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { firstName, lastName, phone, email } = body

        if (!firstName) {
            return NextResponse.json({ error: 'First name is required' }, { status: 400 })
        }

        // Check if phone already exists
        if (phone) {
            const existing = await prisma.client.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    phone
                }
            })
            if (existing) {
                return NextResponse.json({
                    error: 'A customer with this phone number already exists',
                    existingId: existing.id
                }, { status: 409 })
            }
        }

        const client = await prisma.client.create({
            data: {
                franchiseId: user.franchiseId,
                firstName,
                lastName: lastName || '',
                phone: phone || null,
                email: email || null
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                id: client.id,
                name: `${client.firstName} ${client.lastName || ''}`.trim(),
                phone: client.phone,
                email: client.email,
                loyaltyPoints: 0,
                vipTier: null,
                visits: 0
            }
        })
    } catch (error) {
        console.error('[API_CREATE_CLIENT_ERROR]', error)
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
}
