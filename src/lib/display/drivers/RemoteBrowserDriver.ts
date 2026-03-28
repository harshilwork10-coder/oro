/**
 * RemoteBrowserDriver — HTTP polling adapter
 *
 * Wraps the existing /api/pos/display-sync mechanism.
 * Used when the customer display is a separate device (tablet, kiosk)
 * that polls the server for cart updates.
 */

import type { DisplayDriver } from './DisplayDriver'
import type { CartPayload, DriverConfig } from '../types'

export class RemoteBrowserDriver implements DisplayDriver {
    readonly id = 'remote-browser'
    readonly name = 'Remote Browser (HTTP)'
    readonly mode = 'REMOTE_BROWSER'
    readonly isLocal = false  // HTTP API — remote device, requires server round-trip


    private stationId: string | null = null
    private connected = false

    async connect(config: DriverConfig): Promise<void> {
        this.stationId = config.stationId
        this.connected = true
    }

    disconnect(): void {
        // Push an IDLE state so the remote display knows we disconnected
        if (this.stationId) {
            this.postToServer({ items: [], subtotal: 0, tax: 0, total: 0, status: 'IDLE' })
        }
        this.stationId = null
        this.connected = false
    }

    sendCart(cart: CartPayload): void {
        this.postToServer(cart)
    }

    showIdle(): void {
        this.postToServer({ items: [], subtotal: 0, tax: 0, total: 0, status: 'IDLE' })
    }

    showThankYou(customerName?: string, total?: number): void {
        this.postToServer({
            items: [], subtotal: 0, tax: 0, total: total || 0,
            customerName, status: 'COMPLETED',
        })
    }

    async runTestPattern(): Promise<boolean> {
        if (!this.stationId) return false
        this.postToServer({
            items: [{ name: '✅ Display Test', quantity: 1, price: 0, total: 0 }],
            subtotal: 0, tax: 0, total: 0,
            status: 'ACTIVE',
        })
        await new Promise(resolve => setTimeout(resolve, 2000))
        this.showIdle()
        return true
    }

    isConnected(): boolean {
        return this.connected
    }

    // ── Internal ──────────────────────────────────────────────────────────

    private postToServer(cart: Partial<CartPayload>): void {
        if (!this.stationId) return
        fetch('/api/pos/display-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stationId: this.stationId, cart }),
        }).catch(err => console.error('[RemoteBrowserDriver] POST failed:', err))
    }
}
