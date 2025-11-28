import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const tag = searchParams.get('tag')

        const where: any = {}
        // if (type && type !== 'ALL') where.type = type
        // if (tag) where.tags = { contains: tag }

        const posts = await prisma.post.findMany({
            where,
            include: {
                author: {
                    select: {
                        name: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        votes: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(posts)
    } catch (error) {
        console.error('Error fetching posts:', error)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { title, content } = body // Removed type, tags

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                // type: type || 'DISCUSSION', // Removed
                // tags, // Removed
                authorId: session.user.id
            }
        })

        return NextResponse.json(post)
    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
