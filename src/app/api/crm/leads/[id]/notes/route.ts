import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Fetch notes
        const notes = await prisma.note.findMany({
            where: {
                leadId: id,
                lead: { franchisorId: franchisor.id }
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json(notes)
    } catch (error) {
        console.error('Error fetching notes:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Verify lead ownership
        const lead = await prisma.lead.findFirst({
            where: { id, franchisorId: franchisor.id }
        })

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        const body = await req.json()
        const { content, category, isPinned } = body

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        // Create note
        const note = await prisma.note.create({
            data: {
                leadId: id,
                content,
                category: category || 'GENERAL',
                isPinned: isPinned || false,
                createdBy: session.user.id
            }
        })

        return NextResponse.json(note, { status: 201 })
    } catch (error) {
        console.error('Error creating note:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
