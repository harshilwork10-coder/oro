import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
        return NextResponse.json([])
    }

    try {
        const customers = await prisma.client.findMany({
            where: {
                franchiseId: user.franchiseId,
                OR: [
                    { firstName: { contains: query } },
                    { lastName: { contains: query } },
                    { email: { contains: query } },
                    { phone: { contains: query } }
                ]
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        })

        // Map Client to expected format if needed, or just return
        const mappedCustomers = customers.map(c => ({
            ...c,
            name: `${c.firstName} ${c.lastName}`
        }))

        return NextResponse.json(mappedCustomers)
    } catch (error) {
        console.error('Error searching customers:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    try {
        const body = await request.json()
        const { name, email, phone, liabilitySigned, loyaltyJoined } = body

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
        }

        const [firstName, ...lastNameParts] = name.split(' ')
        const lastName = lastNameParts.join(' ') || ''

        const customer = await prisma.client.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                liabilitySigned: liabilitySigned || false,
                loyaltyJoined: loyaltyJoined || false,
                franchiseId: user.franchiseId
            }
        })

        return NextResponse.json({
            ...customer,
            name: `${customer.firstName} ${customer.lastName}`
        })
    } catch (error) {
        console.error('Error creating customer:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

