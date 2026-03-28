import { NextRequest, NextResponse } from 'next/server'
import { GamificationService } from '@/lib/gamification/gamification-service'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const leaderboard = await GamificationService.getLeaderboard()
        return NextResponse.json(leaderboard)
    } catch (error) {
        console.error('Error fetching leaderboard:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}

