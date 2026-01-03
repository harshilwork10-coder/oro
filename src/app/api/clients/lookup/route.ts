import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lookup client by phone number
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
        }

        // Clean phone number - remove non-digits
        const cleanPhone = phone.replace(/\D/g, '')

        // Search for client by phone
        const client = await prisma.client.findFirst({
            where: {
                phone: {
                    contains: cleanPhone
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
            }
        })

        if (client) {
            return NextResponse.json(client)
        } else {
            return NextResponse.json({ found: false }, { status: 404 })
        }
    } catch (error) {
        console.error('Error looking up client:', error)
        return NextResponse.json({ error: 'Failed to lookup client' }, { status: 500 })
    }
}

