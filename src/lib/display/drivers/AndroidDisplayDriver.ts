/**
 * AndroidDisplayDriver — Android WebView JS bridge stub
 *
 * Used on Android POS devices (PAX, Sunmi, etc.) where the customer
 * display is a secondary screen controlled via an Android JS bridge.
 *
 * The native Android app exposes a `window.AndroidDisplay` object:
 *   window.AndroidDisplay.sendCart(json)
 *   window.AndroidDisplay.showIdle()
 *   window.AndroidDisplay.showThankYou(name, total)
 *   window.AndroidDisplay.runTest()
 */

import type { DisplayDriver } from './DisplayDriver'
import type { CartPayload, DriverConfig } from '../types'

declare global {
    interface Window {
        AndroidDisplay?: {
            sendCart(json: string): void
            showIdle(): void
            showThankYou(name: string, total: number): void
            runTest(): boolean
            isAvailable(): boolean
        }
    }
}

export class AndroidDisplayDriver implements DisplayDriver {
    readonly id = 'android-display'
    readonly name = 'Android Display (Native Bridge)'
    readonly mode = 'ANDROID_DISPLAY'
    readonly isLocal = true  // JS bridge — direct hardware, no network


    private connected = false

    async connect(_config: DriverConfig): Promise<void> {
        if (typeof window === 'undefined' || !window.AndroidDisplay) {
            throw new Error('Android display bridge not available')
        }
        if (!window.AndroidDisplay.isAvailable()) {
            throw new Error('Android display hardware not connected')
        }
        this.connected = true
    }

    disconnect(): void {
        this.connected = false
    }

    sendCart(cart: CartPayload): void {
        window.AndroidDisplay?.sendCart(JSON.stringify(cart))
    }

    showIdle(): void {
        window.AndroidDisplay?.showIdle()
    }

    showThankYou(customerName?: string, total?: number): void {
        window.AndroidDisplay?.showThankYou(customerName || '', total || 0)
    }

    async runTestPattern(): Promise<boolean> {
        return window.AndroidDisplay?.runTest() ?? false
    }

    isConnected(): boolean {
        return this.connected && typeof window !== 'undefined' && !!window.AndroidDisplay
    }
}
