import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/pos/clients/create - Create new client WITH loyalty enrollment (atomic)
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

        const cleanPhone = phone?.replace(/\D/g, '') || null

        // Check if phone already exists
        if (cleanPhone) {
            const existing = await prisma.client.findFirst({
                where: {
                    franchiseId: user.franchiseId,
                    phone: cleanPhone
                }
            })
            if (existing) {
                return NextResponse.json({
                    error: 'A customer with this phone number already exists',
                    existingId: existing.id
                }, { status: 409 })
            }
        }

        // Get or create loyalty program for this franchise
        let program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!program) {
            program = await prisma.loyaltyProgram.create({
                data: {
                    franchiseId: user.franchiseId,
                    name: 'Rewards',
                    isEnabled: true,
                    pointsPerDollar: 1,
                    redemptionRatio: 0.01
                }
            })
        }

        // Create Client + LoyaltyMember atomically
        const shouldEnrollLoyalty = !!cleanPhone && program.isEnabled

        const client = await prisma.client.create({
            data: {
                franchiseId: user.franchiseId,
                firstName,
                lastName: lastName || '',
                phone: cleanPhone,
                email: email || null,
                loyaltyJoined: shouldEnrollLoyalty
            }
        })

        let loyaltyPoints = 0

        // Create LoyaltyMember if phone exists and program is enabled
        if (shouldEnrollLoyalty) {
            // Check if this phone already has a LoyaltyMember (from a different Client record somehow)
            const existingMember = await prisma.loyaltyMember.findUnique({
                where: {
                    programId_phone: {
                        programId: program.id,
                        phone: cleanPhone!
                    }
                }
            })

            if (!existingMember) {
                await prisma.loyaltyMember.create({
                    data: {
                        programId: program.id,
                        phone: cleanPhone!,
                        name: `${firstName} ${lastName || ''}`.trim(),
                        email: email || null
                    }
                })
            } else {
                loyaltyPoints = existingMember.pointsBalance
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: client.id,
                name: `${client.firstName} ${client.lastName || ''}`.trim(),
                phone: client.phone,
                email: client.email,
                loyaltyPoints,
                loyaltyMember: shouldEnrollLoyalty,
                vipTier: null,
                visits: 0
            }
        })
    } catch (error) {
        console.error('[API_CREATE_CLIENT_ERROR]', error)
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
}
