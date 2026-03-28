import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

// Direct location booking: /book/l/[locationSlug]
// Resolves the location slug to a franchise slug and redirects
// with the locationId pre-selected as a query param.
export default async function DirectLocationBookingPage({
    params,
}: {
    params: Promise<{ locationSlug: string }>
}) {
    const { locationSlug } = await params

    // Look up location by its slug
    const location = await prisma.location.findUnique({
        where: { slug: locationSlug },
        select: {
            id: true,
            name: true,
            franchise: {
                select: { slug: true }
            },
            bookingProfile: {
                select: { isPublished: true }
            }
        }
    })

    if (!location) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📍</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Location Not Found</h1>
                    <p className="text-red-200">This booking link doesn&apos;t match any location.</p>
                </div>
            </div>
        )
    }

    // Check if booking is published for this location
    if (!location.bookingProfile?.isPublished) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔧</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Coming Soon</h1>
                    <p className="text-amber-200">{location.name} is setting up online booking. Check back soon!</p>
                </div>
            </div>
        )
    }

    // Redirect to the franchise booking page with location pre-selected
    redirect(`/book/${location.franchise.slug}?locationId=${location.id}`)
}
