import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { postId, commentId, value } = body

        if (!postId && !commentId) {
            return NextResponse.json({ error: 'PostId or CommentId is required' }, { status: 400 })
        }

        if (![1, -1].includes(value)) {
            return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 })
        }

        // Check if vote already exists
        const existingVote = await prisma.vote.findFirst({
            where: {
                userId: user.id,
                postId: postId || undefined
                // commentId: commentId || undefined // Removed as not in schema
            }
        })

        const voteType = value === 1 ? 'UPVOTE' : 'DOWNVOTE'

        if (existingVote) {
            if (existingVote.type === voteType) {
                // Toggle off (remove vote)
                await prisma.vote.delete({
                    where: { id: existingVote.id }
                })
                return NextResponse.json({ status: 'removed' })
            } else {
                // Change vote
                const vote = await prisma.vote.update({
                    where: { id: existingVote.id },
                    data: { type: voteType }
                })
                return NextResponse.json(vote)
            }
        } else {
            // Create new vote
            const vote = await prisma.vote.create({
                data: {
                    type: voteType,
                    userId: user.id,
                    postId: postId || undefined
                    // commentId: commentId || undefined // Removed
                }
            })
            return NextResponse.json(vote)
        }

    } catch (error) {
        console.error('Error voting:', error)
        return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
    }
}

