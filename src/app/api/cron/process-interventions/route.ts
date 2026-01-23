import { NextRequest, NextResponse } from 'next/server'
import { InterventionAutomationService } from '@/lib/automation/intervention-scheduler'

// This endpoint is secured with CRON_SECRET in production
export async function POST(request: NextRequest) {
    try {
        // SECURITY: Verify authorization header in production
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const results = await InterventionAutomationService.processPendingInterventions()

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        })
    } catch (error) {
        console.error('Error processing interventions:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

