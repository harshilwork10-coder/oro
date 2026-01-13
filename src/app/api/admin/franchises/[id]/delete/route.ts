import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Schedule franchise for deletion (30-day grace period)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { action } = body // 'schedule' or 'cancel'

        const franchise = await prisma.franchise.findUnique({
            where: { id }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        if (action === 'schedule') {
            // Schedule deletion 30 days from now (industry standard)
            const deletionDate = new Date()
            deletionDate.setDate(deletionDate.getDate() + 30)

            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'PENDING_DELETION',
                    scheduledDeletionAt: deletionDate,
                    suspendedAt: franchise.suspendedAt || new Date()
                }
            })

            // Debug log removed scheduled for deletion on ${deletionDate.toISOString()} by ${session.user.email}`)

            return NextResponse.json({
                success: true,
                message: `Account scheduled for deletion on ${deletionDate.toLocaleDateString()}`,
                deletionDate: deletionDate.toISOString(),
                daysRemaining: 30
            })

        } else if (action === 'cancel') {
            // Cancel pending deletion
            await prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: franchise.suspendedAt ? 'SUSPENDED' : 'ACTIVE',
                    scheduledDeletionAt: null
                }
            })

            // Debug log removed deletion cancelled by ${session.user.email}`)

            return NextResponse.json({
                success: true,
                message: 'Deletion cancelled. Account has been preserved.'
            })

        } else {
            return NextResponse.json({ error: 'Invalid action. Use "schedule" or "cancel"' }, { status: 400 })
        }

    } catch (error) {
        console.error('Schedule deletion error:', error)
        return NextResponse.json({ error: 'Failed to update deletion schedule' }, { status: 500 })
    }
}

// DELETE - Permanently delete franchise data (irreversible)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 })
        }

        const { id } = await params

        const franchise = await prisma.franchise.findUnique({
            where: { id },
            include: {
                users: true,
                transactions: { select: { id: true } },
                clients: { select: { id: true } },
                products: { select: { id: true } }
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Safety check: Only allow deletion if past scheduled date or PENDING_DELETION
        if (franchise.accountStatus !== 'PENDING_DELETION') {
            return NextResponse.json({
                error: 'Account must be in PENDING_DELETION status. Schedule deletion first.'
            }, { status: 400 })
        }

        // Count what will be deleted
        const summary = {
            users: franchise.users.length,
            transactions: franchise.transactions.length,
            clients: franchise.clients.length,
            products: franchise.products.length
        }

        // Delete all related data (cascades where configured)
        // Order matters for foreign key constraints
        await prisma.$transaction([
            // Delete user data
            prisma.user.deleteMany({ where: { franchiseId: id } }),
            // Delete transactions
            prisma.transaction.deleteMany({ where: { franchiseId: id } }),
            // Delete clients
            prisma.client.deleteMany({ where: { franchiseId: id } }),
            // Delete products
            prisma.product.deleteMany({ where: { franchiseId: id } }),
            // Delete locations
            prisma.location.deleteMany({ where: { franchiseId: id } }),
            // Finally, update franchise to DELETED (keep record for audit)
            prisma.franchise.update({
                where: { id },
                data: {
                    accountStatus: 'DELETED',
                    deletedAt: new Date(),
                    // Clear sensitive fields
                    ssn: null,
                    fein: null,
                    routingNumber: null,
                    accountNumber: null
                }
            })
        ])

        // Debug log removed permanently deleted by ${session.user.email}. Summary: ${JSON.stringify(summary)}`)

        return NextResponse.json({
            success: true,
            message: `Account "${franchise.name}" has been permanently deleted`,
            deleted: summary
        })

    } catch (error) {
        console.error('Permanent deletion error:', error)
        return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 })
    }
}
