import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PredictiveAnalysisService } from '@/lib/ai/predictive-analysis'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || (session.user.role !== 'PROVIDER' && session.user.role !== 'FRANCHISOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Run analysis
        const results = await PredictiveAnalysisService.runSystemWideAnalysis()

        return NextResponse.json({
            success: true,
            message: `Analyzed ${results.length} franchises`,
            results
        })
    } catch (error) {
        console.error('Error running predictive analysis:', error)
        return NextResponse.json(
            { error: 'Failed to run analysis' },
            { status: 500 }
        )
    }
}
