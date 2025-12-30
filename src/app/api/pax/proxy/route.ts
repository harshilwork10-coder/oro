import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import net from 'net'

export async function POST(request: NextRequest) {
    // SECURITY: Require authentication - PAX terminal communication is sensitive
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { ip, port, payload } = body

        if (!ip || !port || !payload) {
            return NextResponse.json(
                { error: 'Missing required fields: ip, port, payload' },
                { status: 400 }
            )
        }

        // SECURITY: Only allow connections to private IP ranges (terminal should be on local network)
        if (!isPrivateIP(ip)) {
            console.warn(`[PAX Proxy TCP] BLOCKED: Attempt to connect to non-private IP: ${ip}`)
            return NextResponse.json(
                { error: 'Only local network connections allowed' },
                { status: 403 }
            )
        }

        console.log('[PAX Proxy TCP] ========== NEW REQUEST ==========')
        console.log('[PAX Proxy TCP] User:', session.user.email)
        console.log('[PAX Proxy TCP] Target:', `${ip}:${port}`)
        console.log('[PAX Proxy TCP] Payload (Base64):', payload)

        // Decode the base64 payload to binary
        const binaryData = Buffer.from(payload, 'base64')
        console.log('[PAX Proxy TCP] Payload (Hex):', binaryData.toString('hex'))

        // Send via TCP socket
        const response = await sendTcpRequest(ip, port, binaryData)

        console.log('[PAX Proxy TCP] Response (Hex):', response.toString('hex'))
        console.log('[PAX Proxy TCP] Response (Base64):', response.toString('base64'))
        console.log('[PAX Proxy TCP] ========================================')

        return NextResponse.json({
            success: true,
            response: response.toString('base64'), // Return as base64
            status: 200,
        })
    } catch (error: any) {
        console.error('[PAX Proxy TCP] ERROR:', error.message)

        return NextResponse.json(
            { error: error.message || 'Failed to communicate with PAX device' },
            { status: 500 }
        )
    }
}

// SECURITY: Check if IP is in private range (local network only)
function isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
        /^10\./,                    // 10.0.0.0 - 10.255.255.255
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0 - 172.31.255.255
        /^192\.168\./,              // 192.168.0.0 - 192.168.255.255
        /^127\./,                   // 127.0.0.0 - 127.255.255.255 (localhost)
    ]
    return privateRanges.some(pattern => pattern.test(ip))
}

function sendTcpRequest(ip: string, port: string, data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = new net.Socket()
        let responseData = Buffer.alloc(0)

        // Timeout after 120 seconds
        client.setTimeout(120000)

        client.connect(parseInt(port), ip, () => {
            console.log('[PAX Proxy TCP] Connected, sending data...')
            client.write(data)
        })

        client.on('data', (chunk) => {
            console.log('[PAX Proxy TCP] Received chunk:', chunk.length, 'bytes')
            responseData = Buffer.concat([responseData, chunk])

            // Check if we have a complete response (ends with ETX + LRC)
            if (chunk.includes(0x03)) {
                const stxIndex = responseData.indexOf(0x02);
                if (stxIndex !== -1) {
                    const fsIndex = responseData.indexOf(0x1C, stxIndex);
                    if (fsIndex !== -1) {
                        const command = responseData.subarray(stxIndex + 1, fsIndex).toString('ascii');
                        console.log('[PAX Proxy TCP] Command Received:', command);

                        if (command === 'T01' || command === 'A00') {
                            console.log('[PAX Proxy TCP] Final response received, closing connection');
                            client.destroy();
                        } else {
                            console.log('[PAX Proxy TCP] Status message received (keeping connection open)...');
                        }
                    }
                }
            }
        })

        client.on('close', () => {
            console.log('[PAX Proxy TCP] Connection closed')
            if (responseData.length > 0) {
                resolve(responseData)
            } else {
                reject(new Error('Connection closed without receiving data'))
            }
        })

        client.on('timeout', () => {
            console.log('[PAX Proxy TCP] Connection timeout')
            client.destroy()
            reject(new Error('Request timeout - PAX device did not respond'))
        })

        client.on('error', (err) => {
            console.error('[PAX Proxy TCP] Socket error:', err.message)
            reject(err)
        })
    })
}

