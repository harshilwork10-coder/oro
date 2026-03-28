import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { content } = body

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        const { id } = await params
        const comment = await prisma.comment.create({
            data: {
                content,
                postId: id,
                authorId: user.id
            },
            include: {
                author: {
                    select: { name: true, role: true }
                }
            }
        })

        return NextResponse.json(comment)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }
}
