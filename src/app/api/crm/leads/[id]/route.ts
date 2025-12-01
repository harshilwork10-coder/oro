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

        // Fetch lead with notes and activities
        const lead = await prisma.lead.findFirst({
            where: {
                id,
                franchisorId: franchisor.id
            },
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' }
                },
                activities: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        return NextResponse.json(lead)
    } catch (error) {
        console.error('Error fetching lead:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(
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

        // Verify ownership
        const existingLead = await prisma.lead.findFirst({
            where: { id, franchisorId: franchisor.id }
        })

        if (!existingLead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        const body = await req.json()
        const {
            name, email, phone, company, city, state,
            status, source, estimatedValue, proposedFee,
            lastContact, nextFollowUp
        } = body

        // Update lead
        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                company,
                city,
                state,
                status,
                source,
                estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
                proposedFee: proposedFee ? parseFloat(proposedFee) : null,
                lastContact: lastContact ? new Date(lastContact) : null,
                nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null
            }
        })

        return NextResponse.json(updatedLead)
    } catch (error) {
        console.error('Error updating lead:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
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

        // Verify ownership before deleting
        const lead = await prisma.lead.findFirst({
            where: { id, franchisorId: franchisor.id }
        })

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        // Delete lead (will cascade delete notes and activities)
        await prisma.lead.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting lead:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
