import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Link accounts to create/join master account
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { phone, name, email } = await req.json()

        const cleanPhone = phone?.replace(/\D/g, '')
        if (!cleanPhone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
        }

        // Find all individual memberships for this phone
        const members = await prisma.loyaltyMember.findMany({
            where: {
                phone: cleanPhone,
                masterAccountId: null // Only unlinked members
            },
            include: {
                program: {
                    include: {
                        franchise: { select: { name: true } }
                    }
                }
            }
        })

        if (members.length < 2) {
            return NextResponse.json({
                error: 'Need at least 2 programs to link',
                currentPrograms: members.length
            }, { status: 400 })
        }

        // Calculate total points to pool
        const totalPoints = members.reduce((sum, m) => sum + m.pointsBalance, 0)
        const totalLifetime = members.reduce((sum, m) => sum + m.lifetimePoints, 0)

        // Create or find master account
        let masterAccount = await prisma.loyaltyMasterAccount.findUnique({
            where: { phone: cleanPhone }
        })

        if (!masterAccount) {
            masterAccount = await prisma.loyaltyMasterAccount.create({
                data: {
                    phone: cleanPhone,
                    name: name || members[0].name,
                    email: email || members[0].email,
                    pooledBalance: totalPoints,
                    lifetimePoints: totalLifetime
                }
            })

            // Record the consolidation
            await prisma.pointsTransaction.create({
                data: {
                    masterAccountId: masterAccount.id,
                    type: 'LINK_TRANSFER',
                    points: totalPoints,
                    description: `Consolidated ${members.length} programs into master account`
                }
            })
        }

        // Link all members to master account and zero their balances
        for (const member of members) {
            await prisma.loyaltyMember.update({
                where: { id: member.id },
                data: {
                    masterAccountId: masterAccount.id,
                    pointsBalance: 0 // Transfer to pooled
                }
            })
        }

        return NextResponse.json({
            success: true,
            message: `Linked ${members.length} programs!`,
            masterAccount: {
                id: masterAccount.id,
                phone: masterAccount.phone,
                pooledBalance: masterAccount.pooledBalance,
                lifetimePoints: masterAccount.lifetimePoints
            },
            linkedPrograms: members.map(m => ({
                programName: m.program.name,
                franchiseName: m.program.franchise.name,
                transferredPoints: m.pointsBalance
            }))
        })
    } catch (error) {
        console.error('[LOYALTY_LINK_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE - Unlink an account from master (returns points to individual)
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const memberId = searchParams.get('memberId')

        if (!memberId) {
            return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
        }

        const member = await prisma.loyaltyMember.findUnique({
            where: { id: memberId },
            include: { masterAccount: true }
        })

        if (!member || !member.masterAccountId) {
            return NextResponse.json({ error: 'Member not linked' }, { status: 400 })
        }

        // Count remaining linked members
        const linkedCount = await prisma.loyaltyMember.count({
            where: { masterAccountId: member.masterAccountId }
        })

        if (linkedCount <= 1) {
            return NextResponse.json({
                error: 'Cannot unlink last member - delete master account instead'
            }, { status: 400 })
        }

        // Unlink the member (they lose access to pooled points)
        await prisma.loyaltyMember.update({
            where: { id: memberId },
            data: {
                masterAccountId: null,
                pointsBalance: 0 // Start fresh
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Account unlinked. Points remain in pooled balance.'
        })
    } catch (error) {
        console.error('[LOYALTY_LINK_DELETE]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
