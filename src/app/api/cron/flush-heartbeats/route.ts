/**
 * GET /api/cron/flush-heartbeats
 *
 * Vercel Cron Job — runs every 5 minutes.
 * Flushes buffered heartbeats from Redis → PostgreSQL in a single batch UPDATE.
 *
 * Auth: Vercel CRON_SECRET (set automatically by Vercel for cron invocations).
 * Manual invocation: GET with Authorization: Bearer <CRON_SECRET>
 *
 * Returns: { success, flushed, errors, timestamp }
 */

import { NextResponse } from 'next/server'
import { flushHeartbeats } from '@/lib/heartbeat-buffer'

export async function GET(request: Request) {
    // Verify cron secret (Vercel sets this automatically for cron invocations)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await flushHeartbeats()

        return NextResponse.json({
            success: true,
            flushed: result.flushed,
            errors: result.errors,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('[CronFlushHeartbeats] Error:', error)
        return NextResponse.json({ error: 'Flush failed' }, { status: 500 })
    }
}
