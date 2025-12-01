import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get franchisor ID
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Fetch all leads
        const leads = await prisma.lead.findMany({
            where: { franchisorId: franchisor.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(leads)
    } catch (error) {
        console.error('Error fetching leads:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'FRANCHISOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: session.user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        const body = await req.json()
        const {
            name, email, phone, company, city, state,
            status, source, estimatedValue, proposedFee,
            lastContact, nextFollowUp
        } = body

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
        }

        // Create lead
        const lead = await prisma.lead.create({
            data: {
                franchisorId: franchisor.id,
                name,
                email,
                phone,
                company,
                city,
                state,
                status: status || 'NEW',
                source,
                estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
                proposedFee: proposedFee ? parseFloat(proposedFee) : null,
                lastContact: lastContact ? new Date(lastContact) : null,
                nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null
            }
        })

        return NextResponse.json(lead, { status: 201 })
    } catch (error) {
        console.error('Error creating lead:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
