import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_' + process.env.NEXTAUTH_SECRET?.slice(0, 16)

// Helper to verify mobile auth token
function verifyMobileToken(authHeader: string | null): { userId: string; franchiseId: string; locationId: string | null } | null {
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        const token = authHeader.substring(7)
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; franchiseId: string; locationId: string | null }
        return payload
    } catch {
        return null
    }
}

// Add-on mapping for context-aware suggestions
const ADDON_MAPPING: Record<string, string[]> = {
    'haircut': ['Deep Conditioning', 'Scalp Treatment', 'Blowout', 'Bang Trim'],
    'hair': ['Deep Conditioning', 'Gloss Treatment', 'Olaplex', 'Toner'],
    'facial': ['Eye Treatment', 'Lip Treatment', 'Mask Upgrade', 'LED Therapy'],
    'wax': ['Aftercare Serum', 'Ingrown Treatment', 'Soothing Gel'],
    'threading': ['Brow Tint', 'Brow Lamination', 'Aftercare'],
    'manicure': ['Gel Upgrade', 'Nail Art', 'Paraffin Treatment'],
    'pedicure': ['Gel Upgrade', 'Callus Treatment', 'Paraffin Treatment'],
    'massage': ['Hot Stones', 'Aromatherapy', 'Extended Time'],
    'color': ['Gloss Treatment', 'Toner', 'Olaplex', 'Deep Conditioning']
}

interface SmartTile {
    type: 'top_service' | 'recent' | 'addon' | 'category'
    id: string
    name: string
    price: number
    count?: number
    soldAt?: string
    reason?: string
    icon?: string
}

interface NowNextStatus {
    now: {
        status: 'ready' | 'serving' | 'busy'
        message: string
        customer?: string
        service?: string
    }
    next: {
        id?: string
        time?: string
        customer?: string
        services?: string[]
        stylist?: string
        isLate?: boolean
    } | null
}

/**
 * GET /api/pos/smart-tiles
 * 
 * Returns dynamic smart tiles for WOW Upgrade:
 * - Now/Next appointment status
 * - Top services (7 day rolling)
 * - Recently sold (today)
 * - Context-aware add-on suggestions
 */
export async function GET(req: NextRequest) {
    // Auth - session or JWT
    const session = await getServerSession(authOptions)
    let franchiseId: string | undefined
    let locationId: string | null = null

    if (session?.user?.franchiseId) {
        franchiseId = session.user.franchiseId
    } else {
        const mobileAuth = verifyMobileToken(req.headers.get('Authorization'))
        if (mobileAuth) {
            franchiseId = mobileAuth.franchiseId
            locationId = mobileAuth.locationId
        }
    }

    if (!franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params for context
    const { searchParams } = new URL(req.url)
    const staffId = searchParams.get('staffId')
    const cartItems = searchParams.get('cart')?.split(',').filter(Boolean) || []

    try {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

        // 1. Get NOW/NEXT appointments
        const upcomingAppointments = await prisma.appointment.findMany({
            where: {
                franchiseId,
                startTime: {
                    gte: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago (for late)
                    lte: twoHoursLater
                },
                status: { in: ['PENDING', 'CONFIRMED'] }
            },
            include: {
                client: { select: { firstName: true, lastName: true, phone: true } },
                staff: { select: { name: true } },
                services: { include: { service: { select: { name: true } } } }
            },
            orderBy: { startTime: 'asc' },
            take: 5
        })

        // Build Now/Next status
        const nowNext: NowNextStatus = {
            now: { status: 'ready', message: 'Walk-in Ready' },
            next: null
        }

        if (upcomingAppointments.length > 0) {
            const nextApt = upcomingAppointments[0]
            const aptTime = new Date(nextApt.startTime)
            const isLate = aptTime < now

            nowNext.next = {
                id: nextApt.id,
                time: aptTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                customer: nextApt.client
                    ? `${nextApt.client.firstName} ${nextApt.client.lastName || ''}`.trim()
                    : 'Walk-in',
                services: nextApt.services.map(s => s.service.name),
                stylist: nextApt.staff?.name,
                isLate
            }

            if (isLate) {
                nowNext.now = { status: 'busy', message: 'Appointment Running Late' }
            }
        }

        // 2. Get TOP SERVICES (7 day rolling)
        const topServicesRaw = await prisma.transactionLineItem.groupBy({
            by: ['serviceId'],
            where: {
                transaction: {
                    franchiseId,
                    createdAt: { gte: sevenDaysAgo },
                    status: 'COMPLETED'
                },
                serviceId: { not: null }
            },
            _count: { serviceId: true },
            orderBy: { _count: { serviceId: 'desc' } },
            take: 6
        })

        // Fetch service details
        const topServiceIds = topServicesRaw.map(t => t.serviceId).filter(Boolean) as string[]
        const topServiceDetails = await prisma.service.findMany({
            where: { id: { in: topServiceIds } },
            select: { id: true, name: true, price: true }
        })

        const topServices: SmartTile[] = topServicesRaw.slice(0, 3).map(t => {
            const service = topServiceDetails.find(s => s.id === t.serviceId)
            return {
                type: 'top_service' as const,
                id: t.serviceId || '',
                name: service?.name || 'Service',
                price: service ? parseFloat(service.price.toString()) : 0,
                count: t._count.serviceId,
                icon: '🔥'
            }
        })

        // 3. Get RECENTLY SOLD (today)
        const recentlySold = await prisma.transactionLineItem.findMany({
            where: {
                transaction: {
                    franchiseId,
                    createdAt: { gte: todayStart },
                    status: 'COMPLETED'
                },
                serviceId: { not: null }
            },
            include: {
                service: { select: { id: true, name: true, price: true } },
                transaction: { select: { createdAt: true } }
            },
            orderBy: { transaction: { createdAt: 'desc' } },
            take: 10
        })

        // Deduplicate and take 3
        const seenServiceIds = new Set<string>()
        const recentTiles: SmartTile[] = []
        for (const item of recentlySold) {
            if (item.service && !seenServiceIds.has(item.service.id) && recentTiles.length < 3) {
                seenServiceIds.add(item.service.id)
                const minutesAgo = Math.floor((now.getTime() - new Date(item.transaction.createdAt).getTime()) / 60000)
                recentTiles.push({
                    type: 'recent',
                    id: item.service.id,
                    name: item.service.name,
                    price: parseFloat(item.service.price.toString()),
                    soldAt: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`,
                    icon: '🕐'
                })
            }
        }

        // 4. Get ADD-ON suggestions based on cart context
        const addonTiles: SmartTile[] = []

        // Get all services for matching
        const allServices = await prisma.service.findMany({
            where: { franchiseId },
            select: { id: true, name: true, price: true }
        })

        // Find relevant add-ons based on cart items
        const suggestedAddons = new Set<string>()
        for (const cartItemName of cartItems) {
            const lowerName = cartItemName.toLowerCase()
            for (const [keyword, addons] of Object.entries(ADDON_MAPPING)) {
                if (lowerName.includes(keyword)) {
                    addons.forEach(a => suggestedAddons.add(a.toLowerCase()))
                }
            }
        }

        // Match suggested add-ons to actual services
        for (const service of allServices) {
            const lowerServiceName = service.name.toLowerCase()
            for (const addon of suggestedAddons) {
                if (lowerServiceName.includes(addon) && addonTiles.length < 2) {
                    addonTiles.push({
                        type: 'addon',
                        id: service.id,
                        name: service.name,
                        price: parseFloat(service.price.toString()),
                        reason: 'Popular add-on',
                        icon: '✨'
                    })
                    suggestedAddons.delete(addon)
                    break
                }
            }
        }

        // If no context add-ons, use popular add-ons
        if (addonTiles.length < 2) {
            const popularAddons = allServices
                .filter(s => {
                    const lower = s.name.toLowerCase()
                    return lower.includes('add') || lower.includes('upgrade') ||
                        lower.includes('treatment') || lower.includes('extra') ||
                        parseFloat(s.price.toString()) < 30 // Low-price items are often add-ons
                })
                .slice(0, 2 - addonTiles.length)

            for (const addon of popularAddons) {
                addonTiles.push({
                    type: 'addon',
                    id: addon.id,
                    name: addon.name,
                    price: parseFloat(addon.price.toString()),
                    reason: 'Quick add',
                    icon: '⚡'
                })
            }
        }

        // Combine tiles (8 total)
        const tiles: SmartTile[] = [
            ...topServices,
            ...recentTiles,
            ...addonTiles
        ].slice(0, 8)

        // Format appointments for display
        const appointments = upcomingAppointments.map(apt => ({
            id: apt.id,
            time: new Date(apt.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            customer: apt.client
                ? `${apt.client.firstName} ${apt.client.lastName || ''}`.trim()
                : 'Walk-in',
            services: apt.services.map(s => s.service.name),
            stylist: apt.staff?.name,
            status: apt.status,
            isLate: new Date(apt.startTime) < now
        }))

        return NextResponse.json({
            nowNext,
            tiles,
            appointments,
            cachedAt: now.toISOString(),
            meta: {
                topServicesCount: topServices.length,
                recentCount: recentTiles.length,
                addonsCount: addonTiles.length,
                appointmentsCount: appointments.length
            }
        }, {
            headers: {
                'Cache-Control': 'private, max-age=300' // 5 minute cache
            }
        })

    } catch (error) {
        console.error('[SMART-TILES] Error:', error)
        return NextResponse.json({ error: 'Failed to load smart tiles' }, { status: 500 })
    }
}
