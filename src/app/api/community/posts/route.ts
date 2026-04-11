import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const tag = searchParams.get('tag')

        // Scope posts to user's franchise (PROVIDER sees all)
        const where: any = {}
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            where.author = { franchiseId: user.franchiseId }
        }

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

export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
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
                authorId: user.id
            }
        })

        return NextResponse.json(post)
    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}

