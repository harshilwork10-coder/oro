import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { pin } = await request.json()

        if (!pin || pin.length !== 4) {
            return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user || !user.pin) {
            return NextResponse.json({ error: 'PIN not set' }, { status: 400 })
        }

        const isValid = await compare(pin, user.pin)

        if (!isValid) {
            return NextResponse.json({ success: false }, { status: 401 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('PIN verification error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

