import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams } from '@/lib/pagination'

// POST /api/reviews - Create a new review
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { clientId, rating, feedbackTag, comment, transactionRef } = body

        // Validate required fields
        if (!clientId || !rating) {
            return NextResponse.json({ error: 'Client ID and rating are required' }, { status: 422 })
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 422 })
        }

        // Get franchise ID from user session
        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID not found' }, { status: 400 })
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

        return NextResponse.json(review, { status: 201 })

    } catch (error) {
        console.error('Error creating review:', error)
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }
}

// GET /api/reviews - Fetch reviews for franchise with pagination
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchiseId = user.franchiseId
        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID not found' }, { status: 400 })
        }

        const searchParams = req.nextUrl.searchParams
        const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
        const minRating = searchParams.get('minRating')
        const feedbackTag = searchParams.get('feedbackTag')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        // Build where clause
        const whereClause: Record<string, unknown> = { franchiseId }

        if (minRating) {
            whereClause.rating = { gte: parseInt(minRating) }
        }

        if (feedbackTag) {
            whereClause.feedbackTag = feedbackTag
        }

        if (dateFrom || dateTo) {
            whereClause.createdAt = {}
            if (dateFrom) {
                (whereClause.createdAt as Record<string, Date>).gte = new Date(dateFrom)
            }
            if (dateTo) {
                (whereClause.createdAt as Record<string, Date>).lte = new Date(dateTo + 'T23:59:59')
            }
        }

        // Build query with pagination
        const queryArgs: Record<string, unknown> = {
            where: whereClause,
            take: (take || 50) + 1,
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            },
            orderBy: orderBy || { createdAt: 'desc' }
        }

        if (cursor) {
            queryArgs.cursor = { id: cursor }
            queryArgs.skip = 1
        }

        const reviews = await prisma.review.findMany(
            queryArgs as Parameters<typeof prisma.review.findMany>[0]
        )

        const hasMore = reviews.length > (take || 50)
        const data = hasMore ? reviews.slice(0, take || 50) : reviews
        const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

        return NextResponse.json({ data: data, pagination: {
            nextCursor,
            hasMore,
            total: data.length
        } })

    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }
}
