import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch employee's availability settings
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const employee = await prisma.employee.findUnique({
            where: { id: user.employeeId || user.id },
            select: { id: true, firstName: true, lastName: true, availability: true }
        })

        return NextResponse.json({ availability: employee?.availability || {} })
    } catch (error) {
        console.error('[EMPLOYEE_AVAILABILITY]', error)
        return NextResponse.json({ availability: {} })
    }
}

// POST - Update employee's availability settings
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        await prisma.employee.update({
            where: { id: user.employeeId || user.id },
            data: { availability: body }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[EMPLOYEE_AVAILABILITY_UPDATE]', error)
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }
}
