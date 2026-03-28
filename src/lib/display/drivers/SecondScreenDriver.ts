/**
 * SecondScreenDriver — BroadcastChannel adapter
 *
 * Wraps the existing PosDisplayBroadcast mechanism.
 * Used when the customer display is a second browser window/tab
 * on the same machine (HDMI secondary monitor).
 */

import type { DisplayDriver } from './DisplayDriver'
import type { CartPayload, DriverConfig } from '../types'

export class SecondScreenDriver implements DisplayDriver {
    readonly id = 'second-screen'
    readonly name = 'Secondary Screen (BroadcastChannel)'
    readonly mode = 'SECOND_SCREEN'
    readonly isLocal = true  // BroadcastChannel — zero network, same machine


    private channel: BroadcastChannel | null = null
    private connected = false

    async connect(_config: DriverConfig): Promise<void> {
        this.channel = new BroadcastChannel('pos-customer-display')
        this.connected = true
    }

    disconnect(): void {
        this.channel?.close()
        this.channel = null
        this.connected = false
    }

    sendCart(cart: CartPayload): void {
        if (!this.channel) return
        this.channel.postMessage({
            items: cart.items,
            subtotal: cart.subtotal,
            tax: cart.tax,
            total: cart.total,
            subtotalCash: cart.subtotalCash,
            subtotalCard: cart.subtotalCard,
            taxCash: cart.taxCash,
            taxCard: cart.taxCard,
            cashTotal: cart.cashTotal,
            cardTotal: cart.cardTotal,
            showDualPricing: cart.showDualPricing,
            customerName: cart.customerName,
            status: cart.status,
            stationId: cart.stationId,
        })
    }

    showIdle(): void {
        this.channel?.postMessage({
            items: [], subtotal: 0, tax: 0, total: 0, status: 'IDLE',
        })
    }

    showThankYou(customerName?: string, total?: number): void {
        this.channel?.postMessage({
            items: [], subtotal: 0, tax: 0, total: total || 0,
            customerName, status: 'COMPLETE',
        })
    }

    async runTestPattern(): Promise<boolean> {
        if (!this.channel) return false
        this.channel.postMessage({
            items: [{ name: '✅ Display Test', quantity: 1, price: 0, total: 0 }],
            subtotal: 0, tax: 0, total: 0,
            status: 'ACTIVE',
            lastAction: 'TEST_PATTERN',
        })
        // Give user 2 seconds to see the test
        await new Promise(resolve => setTimeout(resolve, 2000))
        this.showIdle()
        return true
    }

    isConnected(): boolean {
        return this.connected
    }
}
