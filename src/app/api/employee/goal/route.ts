import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    const user = await getAuthUser(request)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dailyGoal } = body

    if (dailyGoal === undefined || dailyGoal === null || isNaN(dailyGoal) || dailyGoal < 0) {
        return NextResponse.json({ error: 'Invalid goal amount' }, { status: 400 })
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { email: authUser.email },
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

