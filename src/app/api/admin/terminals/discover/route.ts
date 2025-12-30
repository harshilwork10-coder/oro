import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// API to discover PAX terminal on network and get its MID
// Provider only - helps support when IP changes
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Provider only' }, { status: 403 })
        }

        const { ipAddress, port = '10009' } = await request.json()

        if (!ipAddress) {
            return NextResponse.json({ error: 'IP address required' }, { status: 400 })
        }

        // Try to ping the PAX terminal and get device info
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

            // PAX A35/A920 devices respond to HTTP requests on their configured port
            // We'll try to get device info by calling the PAX status endpoint
            const paxUrl = `http://${ipAddress}:${port}/PaxResponse`

            // First just check if we can reach the terminal
            const response = await fetch(paxUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'text/xml'
                }
            }).catch(() => null)

            clearTimeout(timeoutId)

            if (response && response.ok) {
                return NextResponse.json({
                    success: true,
                    status: 'ONLINE',
                    ipAddress,
                    port,
                    message: 'Terminal is responding'
                })
            } else {
                // Terminal not responding on this IP
                return NextResponse.json({
                    success: false,
                    status: 'OFFLINE',
                    ipAddress,
                    port,
                    message: 'Terminal not responding at this IP'
                })
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return NextResponse.json({
                    success: false,
                    status: 'TIMEOUT',
                    ipAddress,
                    port,
                    message: 'Connection timed out - terminal may be offline or IP changed'
                })
            }
            return NextResponse.json({
                success: false,
                status: 'ERROR',
                ipAddress,
                port,
                message: 'Could not reach terminal'
            })
        }
    } catch (error) {
        console.error('[TERMINAL_DISCOVER]', error)
        return NextResponse.json({ error: 'Discovery failed' }, { status: 500 })
    }
}

// Scan a range of IPs to find PAX terminals
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Provider only' }, { status: 403 })
        }

        const { baseIp, startRange = 1, endRange = 254, port = '10009' } = await request.json()

        if (!baseIp) {
            // Default to common local network range
            return NextResponse.json({ error: 'Base IP required (e.g., 192.168.1)' }, { status: 400 })
        }

        const foundTerminals: Array<{ ip: string, status: string }> = []
        const promises: Promise<void>[] = []

        // Scan IPs in parallel (limit to smaller range for speed)
        const actualEndRange = Math.min(endRange, startRange + 50) // Max 50 IPs at once

        for (let i = startRange; i <= actualEndRange; i++) {
            const ip = `${baseIp}.${i}`
            promises.push(
                (async () => {
                    try {
                        const controller = new AbortController()
                        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

                        const response = await fetch(`http://${ip}:${port}/PaxResponse`, {
                            method: 'GET',
                            signal: controller.signal
                        }).catch(() => null)

                        clearTimeout(timeoutId)

                        if (response && response.ok) {
                            foundTerminals.push({ ip, status: 'FOUND' })
                        }
                    } catch {
                        // Ignore - terminal not at this IP
                    }
                })()
            )
        }

        await Promise.allSettled(promises)

        return NextResponse.json({
            success: true,
            scannedRange: `${baseIp}.${startRange} - ${baseIp}.${actualEndRange}`,
            foundTerminals,
            totalFound: foundTerminals.length
        })
    } catch (error) {
        console.error('[TERMINAL_SCAN]', error)
        return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
    }
}

