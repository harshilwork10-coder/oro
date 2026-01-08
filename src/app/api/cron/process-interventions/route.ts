import { NextRequest, NextResponse } from 'next/server'
import { InterventionAutomationService } from '@/lib/automation/intervention-scheduler'

// This endpoint should be secured with a CRON_SECRET in production
export async function POST(request: NextRequest) {
    try {
        // In a real app, verify authorization header
        // const authHeader = request.headers.get('authorization')
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

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

