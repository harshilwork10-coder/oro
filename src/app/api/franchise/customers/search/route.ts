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
    const phone = searchParams.get('phone')

    if (!phone) {
        return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    try {
        const customers = await prisma.client.findMany({
            where: {
                franchiseId: user.franchiseId,
                phone: {
                    contains: phone
                }
            },
            take: 5
        })

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

