import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Earn or redeem points
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { phone, type, points, description, transactionId, franchiseId } = await req.json()

        const cleanPhone = phone?.replace(/\D/g, '')
        if (!cleanPhone) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
        }

        if (!['EARN', 'REDEEM', 'ADJUST'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        if (!points || points === 0) {
            return NextResponse.json({ error: 'Points amount required' }, { status: 400 })
        }

        // Check for master account (linked/pooled)
        const masterAccount = await prisma.loyaltyMasterAccount.findUnique({
            where: { phone: cleanPhone }
        })

        if (masterAccount) {
            // Use pooled balance
            const pointsChange = type === 'REDEEM' ? -Math.abs(points) : Math.abs(points)

            // Check balance for redemption
            if (type === 'REDEEM' && masterAccount.pooledBalance < Math.abs(points)) {
                return NextResponse.json({
                    error: 'Insufficient points',
                    available: masterAccount.pooledBalance,
                    requested: Math.abs(points)
                }, { status: 400 })
            }

            // Update pooled balance
            const updated = await prisma.loyaltyMasterAccount.update({
                where: { id: masterAccount.id },
                data: {
                    pooledBalance: { increment: pointsChange },
                    lifetimePoints: type === 'EARN' ? { increment: Math.abs(points) } : undefined
                }
            })

            // Record transaction
            await prisma.pointsTransaction.create({
                data: {
                    masterAccountId: masterAccount.id,
                    type,
                    points: pointsChange,
                    description: description || `${type} at location`,
                    transactionId,
                    franchiseId
                }
            })

            // Also update the specific member's lifetime spend if earning
            if (type === 'EARN' && franchiseId) {
                await prisma.loyaltyMember.updateMany({
                    where: {
                        phone: cleanPhone,
                        masterAccountId: masterAccount.id,
                        program: { franchiseId }
                    },
                    data: {
                        lifetimePoints: { increment: Math.abs(points) },
                        lastActivity: new Date()
                    }
                })
            }

            return NextResponse.json({
                success: true,
                type: 'POOLED',
                pointsChange,
                newBalance: updated.pooledBalance,
                lifetimePoints: updated.lifetimePoints
            })
        }

        // Individual membership - find by phone and franchise
        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required for non-linked members' }, { status: 400 })
        }

        const member = await prisma.loyaltyMember.findFirst({
            where: {
                phone: cleanPhone,
                program: { franchiseId }
            },
            include: { program: true }
        })

        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        const pointsChange = type === 'REDEEM' ? -Math.abs(points) : Math.abs(points)

        // Check balance for redemption
        if (type === 'REDEEM' && member.pointsBalance < Math.abs(points)) {
            return NextResponse.json({
                error: 'Insufficient points',
                available: member.pointsBalance,
                requested: Math.abs(points)
            }, { status: 400 })
        }

        // Update member balance
        const updated = await prisma.loyaltyMember.update({
            where: { id: member.id },
            data: {
                pointsBalance: { increment: pointsChange },
                lifetimePoints: type === 'EARN' ? { increment: Math.abs(points) } : undefined,
                lastActivity: new Date()
            }
        })

        // Record transaction
        await prisma.pointsTransaction.create({
            data: {
                programId: member.programId,
                type,
                points: pointsChange,
                description: description || `${type} at ${member.program.name}`,
                transactionId,
                franchiseId
            }
        })

        return NextResponse.json({
            success: true,
            type: 'INDIVIDUAL',
            programName: member.program.name,
            pointsChange,
            newBalance: updated.pointsBalance,
            lifetimePoints: updated.lifetimePoints
        })
    } catch (error) {
        console.error('[LOYALTY_POINTS_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET - Points history
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const phone = searchParams.get('phone')?.replace(/\D/g, '')
        const limit = parseInt(searchParams.get('limit') || '20')

        if (!phone) {
            return NextResponse.json({ error: 'Phone required' }, { status: 400 })
        }

        // Check for master account
        const masterAccount = await prisma.loyaltyMasterAccount.findUnique({
            where: { phone }
        })

        if (masterAccount) {
            const history = await prisma.pointsTransaction.findMany({
                where: { masterAccountId: masterAccount.id },
                orderBy: { createdAt: 'desc' },
                take: limit
            })
            return NextResponse.json({ type: 'POOLED', history })
        }

        // Get individual member history
        const members = await prisma.loyaltyMember.findMany({
            where: { phone },
            select: { programId: true }
        })

        const programIds = members.map(m => m.programId)

        const history = await prisma.pointsTransaction.findMany({
            where: { programId: { in: programIds } },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                program: {
                    include: {
                        franchise: { select: { name: true } }
                    }
                }
            }
        })

        return NextResponse.json({ type: 'INDIVIDUAL', history })
    } catch (error) {
        console.error('[LOYALTY_POINTS_GET]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

