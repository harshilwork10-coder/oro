import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const franchiseId = searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        // Mock data for demo
        const campaigns = [
            {
                id: '1',
                name: 'Summer Sale',
                type: 'EMAIL',
                status: 'SENT',
                sentCount: 1250,
                openRate: 45.2,
                createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
            },
            {
                id: '2',
                name: 'Welcome Series',
                type: 'AUTOMATION',
                status: 'ACTIVE',
                sentCount: 342,
                openRate: 68.5,
                createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
            },
            {
                id: '3',
                name: 'Holiday Special',
                type: 'EMAIL',
                status: 'DRAFT',
                sentCount: 0,
                openRate: 0,
                createdAt: new Date().toISOString()
            }
        ]

        return NextResponse.json(campaigns)
    } catch (error) {
        console.error('Error fetching campaigns:', error)
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name, type, subject, content } = body

        // In real app: Create campaign record
        // Debug log removed`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error creating campaign:', error)
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }
}

