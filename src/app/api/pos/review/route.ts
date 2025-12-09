import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Submit a review from customer display
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { locationId, rating, feedbackTag, transactionId, clientId } = body

        if (!locationId || !rating) {
            return NextResponse.json({ error: 'Location and rating are required' }, { status: 400 })
        }

        // Get location to find franchise
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Create the review
        const review = await prisma.review.create({
            data: {
                franchiseId: location.franchiseId,
                clientId: clientId || null,
                locationId: locationId,
                transactionRef: transactionId || null,
                rating: rating,
                feedbackTag: feedbackTag || null,
                redirectedToGoogle: rating >= 4 && !!location.googlePlaceId // 4-5 stars with Google set up
            }
        })

        // Return Google review URL if 4-5 star rating and Google Place ID is configured
        let googleReviewUrl = null
        if (rating >= 4 && location.googlePlaceId) {
            googleReviewUrl = `https://search.google.com/local/writereview?placeid=${location.googlePlaceId}`
        }

        return NextResponse.json({
            ...review,
            googleReviewUrl,
            shouldRedirect: rating >= 4 && !!googleReviewUrl
        })
    } catch (error: any) {
        console.error('[REVIEW_POST]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// GET - Get reviews for a location (for owner dashboard)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')
        const lowRatingsOnly = searchParams.get('lowRatings') === 'true'

        const where: any = {}
        if (locationId) where.locationId = locationId
        if (lowRatingsOnly) where.rating = { lte: 3 } // 1-3 stars

        const reviews = await prisma.review.findMany({
            where,
            include: {
                client: {
                    select: { firstName: true, lastName: true, phone: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        })

        return NextResponse.json(reviews)
    } catch (error: any) {
        console.error('[REVIEW_GET]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
