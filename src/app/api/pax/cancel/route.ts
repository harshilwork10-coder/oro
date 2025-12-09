import { NextResponse } from 'next/server'
import net from 'net'

// PAX Cancel Command - A14 (Reset/Cancel)
export async function POST(request: Request) {
    try {
        const { ip, port } = await request.json()

        if (!ip || !port) {
            return NextResponse.json({ error: 'IP and port required' }, { status: 400 })
        }

        // Build cancel/reset command (A14)
        // STX + A14 + FS + 1.28 + ETX + LRC
        const STX = String.fromCharCode(0x02)
        const FS = String.fromCharCode(0x1c)
        const ETX = String.fromCharCode(0x03)

        const command = 'A14' // Reset command
        const version = '1.28'

        // Build raw string for LRC
        const rawData = command + FS + version + ETX

        // Calculate LRC (XOR of all bytes after STX, including ETX)
        let lrc = 0
        for (let i = 0; i < rawData.length; i++) {
            lrc ^= rawData.charCodeAt(i)
        }

        const fullCommand = STX + rawData + String.fromCharCode(lrc)
        const base64Command = Buffer.from(fullCommand).toString('base64')

        console.log('[PAX Cancel] Sending reset command to', ip, port)

        // Send via socket
        return new Promise((resolve) => {
            const socket = new net.Socket()
            socket.setTimeout(5000)

            socket.connect(parseInt(port), ip, () => {
                socket.write(Buffer.from(fullCommand))
            })

            socket.on('data', (data) => {
                console.log('[PAX Cancel] Response received')
                socket.destroy()
                resolve(NextResponse.json({ success: true, message: 'Cancel sent' }))
            })

            socket.on('timeout', () => {
                socket.destroy()
                resolve(NextResponse.json({ success: true, message: 'Cancel sent (no response)' }))
            })

            socket.on('error', (err) => {
                console.error('[PAX Cancel] Error:', err)
                socket.destroy()
                // Still return success - the cancel attempt was made
                resolve(NextResponse.json({ success: true, message: 'Cancel attempted' }))
            })
        })

    } catch (error: any) {
        console.error('[PAX Cancel] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
