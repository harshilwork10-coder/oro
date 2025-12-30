import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/reviews - Create a new review
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { clientId, rating, feedbackTag, comment, transactionRef } = body

        // Validate required fields
        if (!clientId || !rating) {
            return NextResponse.json(
                { error: 'Client ID and rating are required' },
                { status: 400 }
            )
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            )
        }

        // Get franchise ID from user session
        const franchiseId = session.user.franchiseId
        if (!franchiseId) {
            return NextResponse.json(
                { error: 'Franchise ID not found' },
                { status: 400 }
            )
        }

        // Create the review
        const review = await prisma.review.create({
            data: {
                franchiseId,
                clientId,
                rating,
                feedbackTag: feedbackTag || null,
                comment: comment || null,
                transactionRef: transactionRef || null,
                postedToGoogle: false,
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            review
        }, { status: 201 })

    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json(
            { error: 'Failed to create review' },
            { status: 500 }
        )
    }
}

// GET /api/reviews - Fetch reviews for franchise
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchiseId = session.user.franchiseId
        if (!franchiseId) {
            return NextResponse.json(
                { error: 'Franchise ID not found' },
                { status: 400 }
            )
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const minRating = searchParams.get('minRating')
            ? parseInt(searchParams.get('minRating')!)
            : undefined

        const reviews = await prisma.review.findMany({
            where: {
                franchiseId,
                ...(minRating && { rating: { gte: minRating } })
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        })

        return NextResponse.json({ reviews })

    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json(
            { error: 'Failed to fetch reviews' },
            { status: 500 }
        )
    }
}

