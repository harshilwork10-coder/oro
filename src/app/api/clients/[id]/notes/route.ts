import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get notes for a client
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { id: clientId } = await params

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        const notes = await prisma.clientNote.findMany({
            where: { clientId },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
        })

        // Also return the inline notes from Client model
        return NextResponse.json({
            notes,
            inlineNotes: {
                allergies: client.allergies,
                preferences: client.preferences,
                internalNotes: client.internalNotes,
                vipStatus: client.vipStatus
            }
        })
    } catch (error) {
        console.error('Error fetching client notes:', error)
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
}

// POST - Add a note to a client
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { id: clientId } = await params

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        const body = await request.json()
        const { note, noteType, isPinned } = body

        if (!note) {
            return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
        }

        const newNote = await prisma.clientNote.create({
            data: {
                clientId,
                note,
                noteType: noteType || 'GENERAL',
                isPinned: isPinned || false,
                createdBy: user.id
            }
        })

        return NextResponse.json(newNote, { status: 201 })
    } catch (error) {
        console.error('Error creating note:', error)
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}

// PUT - Update client notes (inline fields or specific note)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { id: clientId } = await params

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        const body = await request.json()
        const { noteId, allergies, preferences, internalNotes, vipStatus, note, isPinned } = body

        // If noteId provided, update specific note
        if (noteId) {
            const existing = await prisma.clientNote.findFirst({
                where: { id: noteId, clientId }
            })

            if (!existing) {
                return NextResponse.json({ error: 'Note not found' }, { status: 404 })
            }

            const updated = await prisma.clientNote.update({
                where: { id: noteId },
                data: {
                    ...(note !== undefined && { note }),
                    ...(isPinned !== undefined && { isPinned })
                }
            })

            return NextResponse.json(updated)
        }

        // Otherwise update inline notes on Client
        const updated = await prisma.client.update({
            where: { id: clientId },
            data: {
                ...(allergies !== undefined && { allergies }),
                ...(preferences !== undefined && { preferences }),
                ...(internalNotes !== undefined && { internalNotes }),
                ...(vipStatus !== undefined && { vipStatus })
            }
        })

        return NextResponse.json({
            allergies: updated.allergies,
            preferences: updated.preferences,
            internalNotes: updated.internalNotes,
            vipStatus: updated.vipStatus
        })
    } catch (error) {
        console.error('Error updating notes:', error)
        return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
    }
}

// DELETE - Delete a note
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        const franchiseId = user.franchiseId
        const { id: clientId } = await params
        const { searchParams } = new URL(request.url)
        const noteId = searchParams.get('noteId')

        if (!noteId) {
            return NextResponse.json({ error: 'Note ID required' }, { status: 400 })
        }

        // Verify client belongs to franchise
        const client = await prisma.client.findFirst({
            where: { id: clientId, franchiseId }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Verify note exists
        const note = await prisma.clientNote.findFirst({
            where: { id: noteId, clientId }
        })

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 })
        }

        await prisma.clientNote.delete({
            where: { id: noteId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting note:', error)
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }
}
