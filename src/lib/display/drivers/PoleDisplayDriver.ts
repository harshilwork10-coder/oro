/**
 * PoleDisplayDriver — Serial/USB VFD pole display stub
 *
 * This driver is an architectural extension point for 2×20 character
 * VFD pole displays connected via serial (COM port) or USB.
 *
 * Actual serial communication requires a local agent running on the
 * POS machine — the browser cannot access serial ports directly.
 * The agent exposes an HTTP endpoint that this driver POSTs to.
 *
 * Example agent protocol:
 *   POST http://localhost:9100/pole-display
 *   { line1: "ITEM: Widget", line2: "TOTAL: $12.50" }
 */

import type { DisplayDriver } from './DisplayDriver'
import type { CartPayload, DriverConfig } from '../types'

export class PoleDisplayDriver implements DisplayDriver {
    readonly id = 'pole-display'
    readonly name = 'Pole Display (Serial/USB)'
    readonly mode = 'POLE_DISPLAY'
    readonly isLocal = true  // localhost agent — serial/USB on same machine


    private agentUrl: string | null = null
    private connected = false

    async connect(config: DriverConfig): Promise<void> {
        // Agent URL comes from protocolSettings or defaults to localhost:9100
        const settings = config.protocolSettings as { agentUrl?: string } | undefined
        this.agentUrl = settings?.agentUrl || 'http://localhost:9100/pole-display'

        // Verify agent is reachable
        try {
            const res = await fetch(this.agentUrl, { method: 'HEAD' })
            if (!res.ok && res.status !== 405) {
                throw new Error(`Agent responded with ${res.status}`)
            }
            this.connected = true
        } catch (err) {
            this.connected = false
            throw new Error(`Pole display agent not reachable at ${this.agentUrl}: ${err}`)
        }
    }

    disconnect(): void {
        this.sendToAgent('', 'DISCONNECTED')
        this.connected = false
        this.agentUrl = null
    }

    sendCart(cart: CartPayload): void {
        const lastItem = cart.items[cart.items.length - 1]
        const line1 = lastItem
            ? `${lastItem.name.substring(0, 20)}`
            : 'YOUR ORDER'
        const line2 = `TOTAL: $${cart.total.toFixed(2)}`
        this.sendToAgent(line1, line2)
    }

    showIdle(): void {
        this.sendToAgent('WELCOME!', '')
    }

    showThankYou(_customerName?: string, total?: number): void {
        this.sendToAgent('THANK YOU!', total ? `TOTAL: $${total.toFixed(2)}` : 'HAVE A GREAT DAY')
    }

    async runTestPattern(): Promise<boolean> {
        if (!this.agentUrl) return false
        this.sendToAgent('** TEST PATTERN **', '********************')
        await new Promise(resolve => setTimeout(resolve, 2000))
        this.showIdle()
        return true
    }

    isConnected(): boolean {
        return this.connected
    }

    private sendToAgent(line1: string, line2: string): void {
        if (!this.agentUrl) return
        fetch(this.agentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line1, line2 }),
        }).catch(err => console.error('[PoleDisplayDriver]', err))
    }
}
