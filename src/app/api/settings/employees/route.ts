import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch all employees in franchise
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const employees = await prisma.user.findMany({
            where: {
                franchiseId: user.franchiseId,
                role: 'EMPLOYEE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                canManageShifts: true,
                canClockIn: true,
                canClockOut: true
            }
        })

        return NextResponse.json(employees)
    } catch (error) {
        console.error('Error fetching employees:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

