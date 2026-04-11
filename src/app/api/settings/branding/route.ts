import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

// GET - Get store branding settings
export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({
            where: { email: authUser.email! },
            include: {
                franchise: {
                    include: {
                        settings: true
                    }
                }
            }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        const settings = user.franchise?.settings as any

        return NextResponse.json({
            storeLogo: settings?.storeLogo || null,
            storeDisplayName: settings?.storeDisplayName || user.franchise?.name || '',
            primaryColor: settings?.primaryColor || '#F97316',
            storeAddress: settings?.storeAddress || '',
            storeAddress2: settings?.storeAddress2 || '',
            storeCity: settings?.storeCity || '',
            storeState: settings?.storeState || '',
            storeZip: settings?.storeZip || '',
            storePhone: settings?.storePhone || '',
            receiptHeader: settings?.receiptHeader || '',
            receiptFooter: settings?.receiptFooter || 'Thank you for your business!',
            franchiseName: user.franchise?.name || ''
        })
    } catch (error) {
        console.error('[BRANDING_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 })
    }
}

// PUT - Update store branding (Owners only)
export async function PUT(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const user = await prisma.user.findUnique({
            where: { email: authUser.email! },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        if (user.role !== 'OWNER' && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only owners can update branding' }, { status: 403 })
        }

        const body = await req.json()
        const {
            storeLogo, storeDisplayName, storeAddress, storeAddress2,
            storeCity, storeState, storeZip, storePhone,
            receiptHeader, receiptFooter, primaryColor
        } = body

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            create: {
                franchiseId: user.franchiseId,
                storeLogo, storeDisplayName, storeAddress, storeAddress2,
                storeCity, storeState, storeZip, storePhone,
                receiptHeader, receiptFooter, primaryColor
            } as any,
            update: {
                storeLogo, storeDisplayName, storeAddress, storeAddress2,
                storeCity, storeState, storeZip, storePhone,
                receiptHeader, receiptFooter, primaryColor
            } as any
        }) as any

        if (storeZip && user.franchise && !user.franchise.customerId) {
            try {
                const { assignCustomerId } = await import('@/lib/customerId')
                await assignCustomerId(user.franchiseId)
            } catch (error) {
                console.error('Failed to auto-generate customerId:', error)
            }
        }

        await logActivity({
            userId: user.id,
            userEmail: user.email!,
            userRole: 'OWNER',
            action: 'BRANDING_UPDATED',
            entityType: 'FranchiseSettings',
            entityId: user.franchiseId,
            metadata: { fields: Object.keys(body).filter(k => body[k] !== undefined) }
        })

        return NextResponse.json({
            success: true,
            settings: {
                storeLogo: settings.storeLogo,
                storeDisplayName: settings.storeDisplayName,
                storeAddress: settings.storeAddress,
                storeAddress2: settings.storeAddress2,
                storeCity: settings.storeCity,
                storeState: settings.storeState,
                storeZip: settings.storeZip,
                storePhone: settings.storePhone,
                receiptHeader: settings.receiptHeader,
                receiptFooter: settings.receiptFooter,
                primaryColor: settings.primaryColor
            }
        })
    } catch (error) {
        console.error('[BRANDING_PUT]', error)
        return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
    }
}
