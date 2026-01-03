import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                author: {
                    select: { name: true, role: true }
                },
                comments: {
                    include: {
                        author: {
                            select: { name: true, role: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                _count: {
                    select: { votes: true }
                },
                votes: {
                    where: { userId: session.user.id }
                }
            }
        })

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        return NextResponse.json({
            ...post,
            userVote: post.votes[0]?.type === 'UPVOTE' ? 1 : post.votes[0]?.type === 'DOWNVOTE' ? -1 : 0
        })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
    }
}
