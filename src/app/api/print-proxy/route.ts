//
// Print Agent Proxy - Allows HTTPS site to call local HTTP print agent
// Browser → HTTPS /api/print-proxy → HTTP localhost:9100
//
import { NextRequest, NextResponse } from 'next/server'

const PRINT_AGENT_URL = 'http://localhost:9100'

export async function GET(request: NextRequest) {
    const endpoint = request.nextUrl.searchParams.get('endpoint') || 'status'

    try {
        const response = await fetch(`${PRINT_AGENT_URL}/${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
        })

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Print agent not reachable',
            details: error.message
        }, { status: 503 })
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json()
    const endpoint = body.endpoint || 'print'

    try {
        const response = await fetch(`${PRINT_AGENT_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body.data || body),
            signal: AbortSignal.timeout(10000)
        })

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Print agent not reachable',
            details: error.message
        }, { status: 503 })
    }
}
