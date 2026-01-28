import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get store branding settings
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
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
        // Logo & Display
        storeLogo: settings?.storeLogo || null,
        storeDisplayName: settings?.storeDisplayName || user.franchise?.name || '',
        primaryColor: settings?.primaryColor || '#F97316', // Orange default

        // Store Address (for receipt header)
        storeAddress: settings?.storeAddress || '',
        storeAddress2: settings?.storeAddress2 || '',
        storeCity: settings?.storeCity || '',
        storeState: settings?.storeState || '',
        storeZip: settings?.storeZip || '',
        storePhone: settings?.storePhone || '',

        // Receipt Customization (owner decides all text)
        receiptHeader: settings?.receiptHeader || '',
        receiptFooter: settings?.receiptFooter || 'Thank you for your business!',

        // Franchise info
        franchiseName: user.franchise?.name || ''
    })
}

// PUT - Update store branding (Owners only)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    // Only OWNER role can update branding
    if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owners can update branding' }, { status: 403 })
    }

    const body = await request.json()
    const {
        storeLogo,
        storeDisplayName,
        storeAddress,
        storeAddress2,
        storeCity,
        storeState,
        storeZip,
        storePhone,
        receiptHeader,
        receiptFooter,
        primaryColor
    } = body

    // Upsert settings
    const settings = await prisma.franchiseSettings.upsert({
        where: { franchiseId: user.franchiseId },
        create: {
            franchiseId: user.franchiseId,
            storeLogo,
            storeDisplayName,
            storeAddress,
            storeAddress2,
            storeCity,
            storeState,
            storeZip,
            storePhone,
            receiptHeader,
            receiptFooter,
            primaryColor
        } as any,
        update: {
            storeLogo,
            storeDisplayName,
            storeAddress,
            storeAddress2,
            storeCity,
            storeState,
            storeZip,
            storePhone,
            receiptHeader,
            receiptFooter,
            primaryColor
        } as any
    }) as any

    // Auto-generate customerId if storeZip is provided and franchise doesn't have one yet
    if (storeZip && user.franchise && !user.franchise.customerId) {
        try {
            const { assignCustomerId } = await import('@/lib/customerId')
            const customerId = await assignCustomerId(user.franchiseId)
            if (customerId) {
                console.log(`Auto-generated customerId ${customerId} for franchise ${user.franchiseId}`)
            }
        } catch (error) {
            console.error('Failed to auto-generate customerId:', error)
            // Don't fail the request, just log the error
        }
    }

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
}

