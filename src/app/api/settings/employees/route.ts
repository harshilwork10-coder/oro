import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: Fetch all employees in franchise
export async function GET(req: NextRequest) {
    const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: user.email }
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

