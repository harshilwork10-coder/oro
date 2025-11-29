import { NextRequest, NextResponse } from 'next/server'
import net from 'net'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { ip, port, payload } = body

        if (!ip || !port || !payload) {
            return NextResponse.json(
                { error: 'Missing required fields: ip, port, payload' },
                { status: 400 }
            )
        }

        console.log('[PAX Proxy TCP] ========== NEW REQUEST ==========')
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
            // ETX is 0x03
            if (chunk.includes(0x03)) {
                // Check if this is the FINAL response (T01) or just a status message
                // A response starts with STX (0x02) + Command + FS
                // We need to parse the command from the accumulated buffer

                // Find STX
                const stxIndex = responseData.indexOf(0x02);
                if (stxIndex !== -1) {
                    const fsIndex = responseData.indexOf(0x1C, stxIndex);
                    if (fsIndex !== -1) {
                        const command = responseData.subarray(stxIndex + 1, fsIndex).toString('ascii');
                        console.log('[PAX Proxy TCP] Command Received:', command);

                        if (command === 'T01' || command === 'A00') { // T01 = Sale Response, A00 = Init Response
                            console.log('[PAX Proxy TCP] Final response received, closing connection');
                            client.destroy();
                        } else {
                            console.log('[PAX Proxy TCP] Status message received (keeping connection open)...');
                            // Optional: Clear buffer if we want to only return the final response?
                            // But the client might want to see the status messages too.
                            // For now, let's keep accumulating.
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
