import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dailyGoal } = body

    if (dailyGoal === undefined || dailyGoal === null || isNaN(dailyGoal) || dailyGoal < 0) {
        return NextResponse.json({ error: 'Invalid goal amount' }, { status: 400 })
    }

    try {
        const updatedUser = await (prisma as any).user.update({
            where: { email: session.user.email },
            data: {
                dailyGoal: Number(dailyGoal)
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error('Error updating daily goal:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
