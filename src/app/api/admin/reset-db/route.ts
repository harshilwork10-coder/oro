
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export const dynamic = 'force-dynamic'
// Increase timeout for this long operation
export const maxDuration = 60

export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')

    // Security check
    if (secret !== 'super-secret-admin-fix') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log('☢️ STARTING DATABASE RESET...')

        // 1. CLEANUP (Delete everything)
        // Reverse order of dependencies to avoid FK errors

        // Community / Social
        await prisma.vote.deleteMany()
        await prisma.comment.deleteMany()
        await prisma.post.deleteMany()
        await prisma.userBadge.deleteMany()

        // Support
        await prisma.ticketMessage.deleteMany()
        await prisma.ticket.deleteMany()
        await prisma.chatMessage.deleteMany()
        await prisma.chatConversation.deleteMany()
        await prisma.supportChat.deleteMany()

        // Commerce / Orders
        await prisma.tagAlongItem.deleteMany()
        await prisma.itemLineItem.deleteMany()
        await prisma.transactionLineItem.deleteMany()
        await prisma.transaction.deleteMany()
        await prisma.activeCart.deleteMany()

        // Operations
        await prisma.checkIn.deleteMany()
        await prisma.appointment.deleteMany()
        await prisma.schedule.deleteMany()
        await prisma.timeEntry.deleteMany()
        await prisma.timeBlock.deleteMany()

        // Catalog
        await prisma.service.deleteMany()
        await prisma.serviceCategory.deleteMany()
        await prisma.product.deleteMany()
        await prisma.productCategory.deleteMany()
        await prisma.stockOnHand.deleteMany()
        await prisma.item.deleteMany()
        await prisma.unifiedCategory.deleteMany()

        // Hardware
        await prisma.cashDrawerSession.deleteMany()
        await prisma.station.deleteMany()
        await prisma.paymentTerminal.deleteMany()
        await prisma.printerConfig.deleteMany()

        // Clients / Auth
        await prisma.magicLink.deleteMany()
        await prisma.clientMembership.deleteMany()
        await prisma.clientLoyalty.deleteMany()
        await prisma.client.deleteMany()

        // System
        await prisma.notification.deleteMany()
        await prisma.auditLog.deleteMany()

        // Core Hierarchy (Leaf to Root)
        await prisma.user.deleteMany()       // Employees/Owners
        await prisma.location.deleteMany()   // Stores
        await prisma.franchise.deleteMany()  // Sub-companies
        await prisma.businessConfig.deleteMany()
        await prisma.franchisor.deleteMany() // Clients

        console.log('🧹 Database wiped successfully.')

        // 2. RE-SEED (Create Defaults)
        console.log('🌱 Starting Re-Seed...')

        const hashedPassword = await hash('password', 10)
        const hashedPin = await hash('1234', 10)

        // A. PROVIDER (Super Admin)
        await prisma.user.create({
            data: {
                name: 'OroNext Admin',
                email: 'provider@oronext.com',
                password: hashedPassword,
                role: 'PROVIDER'
            }
        })

        // B. CLIENT 1: SALON
        const salonOwner = await prisma.user.create({
            data: {
                name: 'Sarah Salon Owner',
                email: 'salon@demo.com',
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        const salonFranchisor = await prisma.franchisor.create({
            data: {
                name: 'Luxe Hair Studio',
                ownerId: salonOwner.id,
                industryType: 'SERVICE',
                approvalStatus: 'APPROVED',
                accountStatus: 'ACTIVE'
            }
        })

        // Create franchise & location for Salon
        const salonFranchise = await prisma.franchise.create({
            data: {
                name: 'Luxe Downtown',
                slug: 'luxe-downtown',
                franchisorId: salonFranchisor.id,
                approvalStatus: 'APPROVED'
            }
        })

        const salonLocation = await prisma.location.create({
            data: {
                name: 'Main Salon',
                slug: 'main-salon',
                address: '123 Beauty Blvd',
                franchiseId: salonFranchise.id
            }
        })

        // Update owner with location context
        await prisma.user.update({
            where: { id: salonOwner.id },
            data: { franchiseId: salonFranchise.id, locationId: salonLocation.id }
        })

        // C. CLIENT 2: RETAIL
        const retailOwner = await prisma.user.create({
            data: {
                name: 'Mike Retail Owner',
                email: 'retail@demo.com',
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        const retailFranchisor = await prisma.franchisor.create({
            data: {
                name: 'Quick Stop Liquors',
                ownerId: retailOwner.id,
                industryType: 'RETAIL',
                approvalStatus: 'APPROVED',
                accountStatus: 'ACTIVE'
            }
        })

        // D. USER REQUESTED ACCOUNT (zxcvb@gmail.com) - Restored as Admin
        await prisma.user.create({
            data: {
                name: 'Restored User',
                email: 'zxcvb@gmail.com',
                password: hashedPassword,
                role: 'PROVIDER' // Make them admin so they can see everything immediately
            }
        })

        console.log('✅ Re-seed complete.')

        return NextResponse.json({
            success: true,
            message: 'Database has been nuked and re-seeded.',
            credentials: {
                admin: { email: 'provider@oronext.com', password: 'password' },
                you: { email: 'zxcvb@gmail.com', password: 'password' }
            }
        })

    } catch (error: any) {
        console.error('Reset failed:', error)
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
