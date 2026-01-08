import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reviews/export - Export reviews for manual Google posting
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
        const format = searchParams.get('format') || 'json' // json or csv
        const onlyUnposted = searchParams.get('onlyUnposted') === 'true'

        const reviews = await prisma.review.findMany({
            where: {
                franchiseId,
                ...(onlyUnposted && { postedToGoogle: false })
            },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (format === 'csv') {
            // Generate CSV
            const headers = ['Date', 'Customer Name', 'Email', 'Phone', 'Rating', 'Feedback Tag', 'Comment', 'Posted to Google']
            const rows = reviews.map((review: any) => [
                new Date(review.createdAt).toLocaleDateString(),
                `${review.client.firstName} ${review.client.lastName}`,
                review.client.email || '',
                review.client.phone || '',
                review.rating.toString(),
                review.feedbackTag || '',
                review.comment || '',
                review.postedToGoogle ? 'Yes' : 'No'
            ])

            const csv = [
                headers.join(','),
                ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
            ].join('\n')

            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="reviews-export-${Date.now()}.csv"`
                }
            })
        }

        // Return JSON format
        return NextResponse.json({
            count: reviews.length,
            reviews: reviews.map((review: any) => ({
                id: review.id,
                date: review.createdAt,
                customer: {
                    name: `${review.client.firstName} ${review.client.lastName}`,
                    email: review.client.email,
                    phone: review.client.phone
                },
                rating: review.rating,
                feedbackTag: review.feedbackTag,
                comment: review.comment,
                postedToGoogle: review.postedToGoogle,
                googleReviewId: review.googleReviewId
            }))
        })

    } catch (error) {
        console.error('Error exporting reviews:', error)
        return NextResponse.json(
            { error: 'Failed to export reviews' },
            { status: 500 }
        )
    }
}

