import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lookup member by phone, show all linked programs and pooled balance
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const phone = searchParams.get('phone')?.replace(/\D/g, '') // Strip non-digits
        const franchiseId = searchParams.get('franchiseId')

        if (!phone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
        }

        // First, check if master account exists (linked accounts)
        const masterAccount = await prisma.loyaltyMasterAccount.findUnique({
            where: { phone },
            include: {
                linkedMembers: {
                    include: {
                        program: {
                            include: {
                                franchise: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (masterAccount) {
            // Customer has linked accounts - return pooled balance
            return NextResponse.json({
                type: 'LINKED',
                masterAccount: {
                    id: masterAccount.id,
                    phone: masterAccount.phone,
                    name: masterAccount.name,
                    email: masterAccount.email,
                    pooledBalance: masterAccount.pooledBalance,
                    lifetimePoints: masterAccount.lifetimePoints
                },
                linkedPrograms: masterAccount.linkedMembers.map(m => ({
                    memberId: m.id,
                    programId: m.programId,
                    programName: m.program.name,
                    franchiseId: m.program.franchise.id,
                    franchiseName: m.program.franchise.name,
                    lifetimeSpend: m.lifetimeSpend
                }))
            })
        }

        // Check for individual program membership(s)
        const whereClause: any = { phone }
        if (franchiseId) {
            whereClause.program = { franchiseId }
        }

        const members = await prisma.loyaltyMember.findMany({
            where: whereClause,
            include: {
                program: {
                    include: {
                        franchise: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        })

        if (members.length === 0) {
            return NextResponse.json({ type: 'NOT_FOUND', phone })
        }

        // Return individual memberships
        return NextResponse.json({
            type: 'INDIVIDUAL',
            phone,
            name: members[0].name,
            email: members[0].email,
            memberships: members.map(m => ({
                memberId: m.id,
                programId: m.programId,
                programName: m.program.name,
                franchiseId: m.program.franchise.id,
                franchiseName: m.program.franchise.name,
                pointsBalance: m.pointsBalance,
                lifetimePoints: m.lifetimePoints,
                lifetimeSpend: m.lifetimeSpend
            })),
            // Suggest linking if multiple memberships
            canLink: members.length > 1
        })
    } catch (error) {
        console.error('[LOYALTY_MEMBERS_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - Enroll customer in program
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { phone, name, email, franchiseId } = await req.json()

        const cleanPhone = phone?.replace(/\D/g, '')
        if (!cleanPhone || cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
        }

        // Security: Use session franchiseId or verify ownership
        const targetFranchiseId = franchiseId || user.franchiseId
        if (targetFranchiseId !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Find or create loyalty program for franchise
        let program = await prisma.loyaltyProgram.findUnique({
            where: { franchiseId: targetFranchiseId }
        })

        if (!program) {
            // Auto-create program with defaults
            program = await prisma.loyaltyProgram.create({
                data: {
                    franchiseId: targetFranchiseId,
                    name: 'Rewards',
                    isEnabled: true,
                    pointsPerDollar: 1,
                    redemptionRatio: 0.01
                }
            })
        }

        // Check if already enrolled
        const existing = await prisma.loyaltyMember.findUnique({
            where: {
                programId_phone: {
                    programId: program.id,
                    phone: cleanPhone
                }
            }
        })

        if (existing) {
            return NextResponse.json({
                error: 'Already enrolled in this program',
                member: existing
            }, { status: 409 })
        }

        // Create member
        const member = await prisma.loyaltyMember.create({
            data: {
                programId: program.id,
                phone: cleanPhone,
                name,
                email
            },
            include: {
                program: {
                    include: {
                        franchise: {
                            select: { name: true }
                        }
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: `Enrolled in ${member.program.franchise.name} ${member.program.name}!`,
            member
        })
    } catch (error) {
        console.error('[LOYALTY_MEMBERS_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

