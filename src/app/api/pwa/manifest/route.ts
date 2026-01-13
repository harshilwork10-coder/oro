import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Dynamic PWA Manifest Generator
// Returns personalized manifest based on context:
// - Shop slug → Shop-branded customer PWA
// - User ID → Barber/Owner-specific PWA

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const shopSlug = searchParams.get('shop')
        const userId = searchParams.get('user')
        const role = searchParams.get('role') // owner, barber, customer

        // Default manifest (fallback)
        const defaultManifest = {
            name: 'Oro 9 Pulse',
            short_name: 'Oro 9',
            description: 'Point of Sale System',
            start_url: '/dashboard',
            display: 'standalone',
            background_color: '#0a0a0a',
            theme_color: '#7c3aed',
            orientation: 'any',
            icons: [
                { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
                { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
            ]
        }

        // If shop slug provided → Customer app for that shop
        if (shopSlug) {
            const franchise = await prisma.franchise.findUnique({
                where: { slug: shopSlug },
                include: {
                    settings: true
                }
            })

            if (!franchise) {
                return NextResponse.json(defaultManifest, {
                    headers: { 'Content-Type': 'application/manifest+json' }
                })
            }

            const settings = franchise.settings
            const shopName = settings?.storeDisplayName || franchise.name
            const themeColor = settings?.primaryColor || '#7c3aed'
            const logoUrl = settings?.storeLogo || '/icons/icon-192x192.png'

            const customerManifest = {
                name: shopName,
                short_name: shopName.substring(0, 12),
                description: `Book appointments at ${shopName}`,
                start_url: `/book/${shopSlug}`,
                display: 'standalone',
                background_color: '#0a0a0a',
                theme_color: themeColor,
                orientation: 'portrait',
                icons: [
                    { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
                    { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
                ],
                shortcuts: [
                    {
                        name: 'Book Now',
                        short_name: 'Book',
                        url: `/book/${shopSlug}`,
                        icons: [{ src: logoUrl, sizes: '96x96' }]
                    }
                ],
                categories: ['lifestyle', 'beauty', 'health']
            }

            return NextResponse.json(customerManifest, {
                headers: { 'Content-Type': 'application/manifest+json' }
            })
        }

        // If user ID provided → Barber or Owner personalized app
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    franchise: {
                        include: { settings: true }
                    }
                }
            })

            if (!user) {
                return NextResponse.json(defaultManifest, {
                    headers: { 'Content-Type': 'application/manifest+json' }
                })
            }

            const franchise = user.franchise
            const settings = franchise?.settings
            const shopName = settings?.storeDisplayName || franchise?.name || 'Oro 9'
            const themeColor = settings?.primaryColor || '#7c3aed'
            const logoUrl = settings?.storeLogo || '/icons/icon-192x192.png'

            const isOwner = ['OWNER', 'MANAGER', 'FRANCHISOR'].includes(user.role)
            const isBarber = user.role === 'EMPLOYEE'

            if (isOwner) {
                // Owner Dashboard PWA
                const ownerManifest = {
                    name: `${shopName} Dashboard`,
                    short_name: shopName.substring(0, 10),
                    description: `Manage ${shopName}`,
                    start_url: '/pulse',
                    display: 'standalone',
                    background_color: '#0a0a0a',
                    theme_color: themeColor,
                    orientation: 'any',
                    icons: [
                        { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
                        { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
                    ],
                    shortcuts: [
                        { name: 'Dashboard', short_name: 'Home', url: '/pulse', icons: [{ src: logoUrl, sizes: '96x96' }] },
                        { name: 'Appointments', short_name: 'Appts', url: '/dashboard/appointments', icons: [{ src: logoUrl, sizes: '96x96' }] },
                        { name: 'Reports', short_name: 'Reports', url: '/dashboard/reports', icons: [{ src: logoUrl, sizes: '96x96' }] }
                    ],
                    categories: ['business', 'productivity']
                }

                return NextResponse.json(ownerManifest, {
                    headers: { 'Content-Type': 'application/manifest+json' }
                })
            }

            if (isBarber) {
                // Barber's Personal Schedule PWA
                const barberName = user.name || 'My Schedule'
                const barberManifest = {
                    name: `${barberName}'s Schedule`,
                    short_name: barberName.split(' ')[0] || 'Schedule',
                    description: `${barberName} at ${shopName}`,
                    start_url: '/my-schedule',
                    display: 'standalone',
                    background_color: '#0a0a0a',
                    theme_color: themeColor,
                    orientation: 'portrait',
                    icons: [
                        { src: user.profilePhotoUrl || user.image || logoUrl, sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
                        { src: user.profilePhotoUrl || user.image || logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
                    ],
                    shortcuts: [
                        { name: 'Today', short_name: 'Today', url: '/my-schedule', icons: [{ src: logoUrl, sizes: '96x96' }] },
                        { name: 'My Clients', short_name: 'Clients', url: '/my-schedule/clients', icons: [{ src: logoUrl, sizes: '96x96' }] },
                        { name: 'My Link', short_name: 'Share', url: '/my-schedule/share', icons: [{ src: logoUrl, sizes: '96x96' }] }
                    ],
                    categories: ['business', 'productivity', 'lifestyle']
                }

                return NextResponse.json(barberManifest, {
                    headers: { 'Content-Type': 'application/manifest+json' }
                })
            }
        }

        // Fallback to default
        return NextResponse.json(defaultManifest, {
            headers: { 'Content-Type': 'application/manifest+json' }
        })
    } catch (error) {
        console.error('Error generating manifest:', error)
        // Return default manifest on error
        return NextResponse.json({
            name: 'Oro 9 Pulse',
            short_name: 'Oro 9',
            start_url: '/dashboard',
            display: 'standalone',
            background_color: '#0a0a0a',
            theme_color: '#7c3aed',
            icons: [
                { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
        }, {
            headers: { 'Content-Type': 'application/manifest+json' }
        })
    }
}
