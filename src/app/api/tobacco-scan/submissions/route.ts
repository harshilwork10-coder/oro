import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tobacco-scan/submissions - List all tobacco scan submissions
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const submissions = await prisma.tobaccoScanSubmission.findMany({
            where: { franchiseId: session.user.franchiseId },
            orderBy: { weekStartDate: 'desc' },
            take: 20
        })

        return NextResponse.json({ submissions })
    } catch (error) {
        console.error('Failed to fetch tobacco submissions:', error)
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }
}

