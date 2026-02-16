import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateCuid, applyRateLimit, logSuccess, logFailure, RATE_LIMITS } from '@/lib/security'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    // Debug log removed
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await prisma.franchisor.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                approvalStatus: true,
                businessType: true,
                address: true,
                phone: true,
                // Processing & Tax info
                ssn: true,
                fein: true,
                // Documents
                voidCheckUrl: true,
                driverLicenseUrl: true,
                feinLetterUrl: true,
                createdAt: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                franchises: {
                    select: {
                        id: true,
                        name: true,
                        _count: {
                            select: { users: true }
                        },
                        locations: {
                            select: {
                                id: true,
                                name: true,
                                googlePlaceId: true
                            }
                        }
                    }
                },
                _count: {
                    select: { franchises: true }
                }
            }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        return NextResponse.json(client)
    } catch (error) {
        console.error('Error fetching client details:', error)
        return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const {
            name,
            ownerName,
            ownerEmail,
            status,
            notes,
            brandColorPrimary,
            brandColorSecondary,
            logoUrl,
            domain
        } = await req.json()

        // Update franchisor
        const updated = await prisma.franchisor.update({
            where: { id },
            data: {
                name,
                // Update owner info
                owner: {
                    update: {
                        name: ownerName,
                        email: ownerEmail,
                    }
                },
                // Update branding
                brandColorPrimary,
                brandColorSecondary,
                logoUrl,
                domain,
            },
            include: {
                owner: true,
                _count: {
                    select: { franchises: true }
                }
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating client:', error)
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    // Debug log removed

    try {
        // 1. Input Validation
        const validation = validateCuid(id)
        if (!validation.valid) {
            return NextResponse.json({
                error: 'Invalid ID format',
                details: validation.error
            }, { status: 400 })
        }

        // 2. Authentication
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 3. Rate Limiting
        const rateLimitResponse = await applyRateLimit(
            `/api/admin/clients/delete:${session.user.id}`,
            RATE_LIMITS.api
        )
        if (rateLimitResponse) {
            return rateLimitResponse
        }

        // Get franchisor to find owner
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            select: {
                ownerId: true,
                name: true
            }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }


        // Debug log removed

        // 1. Gather all Franchise IDs and Location IDs to target related data
        const franchises = await prisma.franchise.findMany({
            where: { franchisorId: id },
            select: { id: true }
        })
        const franchiseIds = franchises.map(f => f.id)

        const locations = await prisma.location.findMany({
            where: { franchiseId: { in: franchiseIds } },
            select: { id: true }
        })
        const locationIds = locations.map(l => l.id)

        // Debug log removed

        // 2. Delete Transaction Data (Deepest dependencies)
        // TransactionLineItems depend on Transactions
        await prisma.transactionLineItem.deleteMany({
            where: { transaction: { franchiseId: { in: franchiseIds } } }
        })
        // Debug log removed

        // Transactions depend on Franchises
        await prisma.transaction.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        // Debug log removed

        // 3. Delete Operational Data
        // Appointments depend on Locations
        await prisma.appointment.deleteMany({
            where: { locationId: { in: locationIds } }
        })
        // Debug log removed

        // Schedules depend on Locations
        await prisma.schedule.deleteMany({
            where: { locationId: { in: locationIds } }
        })
        // Debug log removed

        // TimeEntries depend on Locations
        await prisma.timeEntry.deleteMany({
            where: { locationId: { in: locationIds } }
        })
        // Debug log removed

        // Cash Management
        await prisma.cashDrop.deleteMany({
            where: { session: { locationId: { in: locationIds } } }
        })
        await prisma.cashDrawerSession.deleteMany({
            where: { locationId: { in: locationIds } }
        })
        // Debug log removed

        // Inventory & Supply Chain
        await prisma.stockAdjustment.deleteMany({
            where: { locationId: { in: locationIds } }
        })
        await prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrder: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.purchaseOrder.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.productSupplier.deleteMany({
            where: { supplier: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.supplier.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        // Debug log removed

        // 4. Delete Customer Data
        // First, delete all Client-related tables that reference Client
        await prisma.chatConversation.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.customerPromo.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.clientPhoto.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.clientNote.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        // Delete PackageUsage before PackagePurchase
        await prisma.packageUsage.deleteMany({
            where: { purchase: { client: { franchiseId: { in: franchiseIds } } } }
        })
        await prisma.packagePurchase.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.recurringAppointment.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.checkIn.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })

        // Now delete memberships and loyalty
        await prisma.clientMembership.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.clientLoyalty.deleteMany({
            where: { client: { franchiseId: { in: franchiseIds } } }
        })
        await prisma.review.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        // Now safe to delete Clients
        await prisma.client.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        // Debug log removed

        // 5. Delete Franchise Configuration
        await prisma.giftCard.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.discount.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.commissionRule.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.royaltyRecord.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.membershipPlan.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.service.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.product.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.serviceCategory.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        // Debug log removed

        // 6. Delete Hardware & Users
        await prisma.terminal.deleteMany({
            where: { locationId: { in: locationIds } }
        })

        // Get all user IDs that will be deleted (employees linked to these franchises/locations)
        const usersToDelete = await prisma.user.findMany({
            where: {
                OR: [
                    { franchiseId: { in: franchiseIds } },
                    { locationId: { in: locationIds } }
                ]
            },
            select: { id: true }
        })
        const userIds = usersToDelete.map(u => u.id)

        // Delete User-related data before deleting users
        if (userIds.length > 0) {
            // Community data - need to handle posts and their related votes/comments
            // First, get post IDs authored by these users
            const userPosts = await prisma.post.findMany({
                where: { authorId: { in: userIds } },
                select: { id: true }
            })
            const postIds = userPosts.map(p => p.id)

            // Delete all votes and comments ON those posts (by any user)
            if (postIds.length > 0) {
                await prisma.vote.deleteMany({ where: { postId: { in: postIds } } })
                await prisma.comment.deleteMany({ where: { postId: { in: postIds } } })
            }

            // Also delete votes and comments BY these users (on other posts)
            await prisma.vote.deleteMany({ where: { userId: { in: userIds } } })
            await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } })

            // Now delete the posts
            await prisma.post.deleteMany({ where: { authorId: { in: userIds } } })

            // Delete badges
            await prisma.userBadge.deleteMany({ where: { userId: { in: userIds } } })

            // Active carts
            await prisma.activeCart.deleteMany({ where: { userId: { in: userIds } } })

            // Magic links
            await prisma.magicLink.deleteMany({ where: { userId: { in: userIds } } })

            // Advanced commission system
            await prisma.payrollEntry.deleteMany({ where: { employeeId: { in: userIds } } })
            await prisma.serviceCommissionOverride.deleteMany({ where: { employeeId: { in: userIds } } })
            await prisma.commissionTier.deleteMany({ where: { employeeId: { in: userIds } } })
            await prisma.employeePaymentConfig.deleteMany({ where: { employeeId: { in: userIds } } })
        }

        // Delete employees (Users linked to franchise/location)
        await prisma.user.deleteMany({
            where: {
                OR: [
                    { franchiseId: { in: franchiseIds } },
                    { locationId: { in: locationIds } }
                ]
            }
        })
        // Debug log removed

        // 7. Delete Franchise-level settings and Locations & Franchises
        // Delete optional relations that don't have cascade
        await prisma.loyaltyProgram.deleteMany({ where: { franchiseId: { in: franchiseIds } } })
        await prisma.splitPayoutConfig.deleteMany({ where: { franchiseId: { in: franchiseIds } } })
        await prisma.franchiseSettings.deleteMany({ where: { franchiseId: { in: franchiseIds } } })

        await prisma.location.deleteMany({
            where: { franchiseId: { in: franchiseIds } }
        })
        await prisma.franchise.deleteMany({
            where: { franchisorId: id }
        })
        // Debug log removed

        // 8. Delete Franchisor Level Data
        // Lead and Territory models were removed from schema
        await prisma.globalService.deleteMany({ where: { franchisorId: id } })
        await prisma.globalProduct.deleteMany({ where: { franchisorId: id } })
        await prisma.royaltyConfig.deleteMany({ where: { franchisorId: id } })
        // BusinessConfig has cascade delete from Franchisor usually, but let's be safe
        await prisma.businessConfig.deleteMany({ where: { franchisorId: id } })

        // Debug log removed

        // 9. Delete Franchisor & Owner
        await prisma.franchisor.delete({
            where: { id }
        })
        // Debug log removed

        // Delete magic links for owner
        await prisma.magicLink.deleteMany({
            where: { userId: franchisor.ownerId }
        })

        // Clean up owner's related data before deleting owner
        // Community data - get owner's posts first
        const ownerPosts = await prisma.post.findMany({
            where: { authorId: franchisor.ownerId },
            select: { id: true }
        })
        const ownerPostIds = ownerPosts.map(p => p.id)

        if (ownerPostIds.length > 0) {
            await prisma.vote.deleteMany({ where: { postId: { in: ownerPostIds } } })
            await prisma.comment.deleteMany({ where: { postId: { in: ownerPostIds } } })
        }
        await prisma.vote.deleteMany({ where: { userId: franchisor.ownerId } })
        await prisma.comment.deleteMany({ where: { authorId: franchisor.ownerId } })
        await prisma.post.deleteMany({ where: { authorId: franchisor.ownerId } })
        await prisma.userBadge.deleteMany({ where: { userId: franchisor.ownerId } })
        await prisma.activeCart.deleteMany({ where: { userId: franchisor.ownerId } })

        // Commission system data for owner
        await prisma.payrollEntry.deleteMany({ where: { employeeId: franchisor.ownerId } })
        await prisma.serviceCommissionOverride.deleteMany({ where: { employeeId: franchisor.ownerId } })
        await prisma.commissionTier.deleteMany({ where: { employeeId: franchisor.ownerId } })
        await prisma.employeePaymentConfig.deleteMany({ where: { employeeId: franchisor.ownerId } })

        // Delete owner user account
        await prisma.user.delete({
            where: { id: franchisor.ownerId }
        })
        // Debug log removed

        // Audit Log - Success
        await logSuccess({
            userId: session.user.id,
            userEmail: session.user.email || '',
            userRole: session.user.role,
            action: 'DELETE',
            resource: 'Franchisor',
            resourceId: id,
            details: {
                franchisorName: franchisor.name,
                deletedBy: session.user.email
            }
        })

        // Debug log removed
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('❌ Error deleting client:', error)
        console.error('Error details JSON:', JSON.stringify(error, null, 2))

        // Audit Log - Failure (best effort, don't await)
        const session = await getServerSession(authOptions)
        if (session) {
            logFailure({
                userId: session.user.id,
                userEmail: session.user.email || '',
                userRole: session.user.role,
                action: 'DELETE',
                resource: 'Franchisor',
                resourceId: id,
                errorMessage: error.message
            }).catch(() => { }) // Ignore audit logging errors
        }

        return NextResponse.json({
            error: 'Failed to delete client',
            details: error.message
        }, { status: 500 })
    }
}
