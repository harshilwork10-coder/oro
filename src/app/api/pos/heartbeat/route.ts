/**
 * POST /api/pos/heartbeat
 *
 * Station-authenticated endpoint. Receives health telemetry from POS devices.
 * Buffers data in Redis — does NOT write directly to PostgreSQL.
 * A cron job (GET /api/cron/flush-heartbeats) flushes to DB every 5 minutes.
 *
 * Auth: Station token (via withPOSAuth)
 *
 * Body: {
 *   appVersion?: string,
 *   osVersion?: string,
 *   deviceModel?: string,
 *   batteryLevel?: number,
 *   networkType?: string,   // WIFI, ETHERNET, CELLULAR, OFFLINE
 *   pendingSyncCount?: number,
 *   diskFreeBytes?: number,
 *   memoryFreeMb?: number,
 *   uptimeSeconds?: number
 * }
 *
 * Returns: { success: true, serverTime: string }
 */

import { NextResponse } from 'next/server'
import { validateStationFromRequest } from '@/lib/stationToken'
import { bufferHeartbeat, HeartbeatData } from '@/lib/heartbeat-buffer'

export async function POST(request: Request) {
    try {
        let body: Record<string, unknown> = {}
        try { body = await request.json() } catch { /* empty body produces timestamp-only heartbeat */ }

        // ── Station Authentication ──
        const station = await validateStationFromRequest(
            request.headers,
            body as { stationToken?: string; deviceId?: string }
        )

        if (!station) {
            return NextResponse.json(
                { error: 'Station authentication required.' },
                { status: 401 }
            )
        }

        // ── Build heartbeat payload ──
        const data: HeartbeatData = {
            lastSeen: new Date().toISOString(),
            appVersion: typeof body.appVersion === 'string' ? body.appVersion : null,
            osVersion: typeof body.osVersion === 'string' ? body.osVersion : null,
            deviceModel: typeof body.deviceModel === 'string' ? body.deviceModel : null,
            batteryLevel: typeof body.batteryLevel === 'number' ? body.batteryLevel : null,
            networkType: typeof body.networkType === 'string' ? body.networkType : null,
            pendingSyncCount: typeof body.pendingSyncCount === 'number' ? body.pendingSyncCount : null,
            diskFreeBytes: typeof body.diskFreeBytes === 'number' ? body.diskFreeBytes : null,
            memoryFreeMb: typeof body.memoryFreeMb === 'number' ? body.memoryFreeMb : null,
            uptimeSeconds: typeof body.uptimeSeconds === 'number' ? body.uptimeSeconds : null,
        }

        // ── Buffer in Redis — NO database write ──
        await bufferHeartbeat(station.stationId, data)

        return NextResponse.json({
            success: true,
            serverTime: new Date().toISOString()
        })
    } catch (error) {
        console.error('[Heartbeat] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
