/**
 * VendorIntegratedDriver — Vendor SDK stub
 *
 * Used for vendor-specific integrated displays that have their own
 * SDK or API (e.g. PAX S-series ECDs, Clover customer display).
 *
 * Each vendor integration would subclass or configure this driver
 * with the vendor-specific protocol details.
 *
 * This stub delegates to a vendor SDK shim that must be loaded
 * separately (e.g. via script tag or npm package).
 */

import type { DisplayDriver } from './DisplayDriver'
import type { CartPayload, DriverConfig } from '../types'

declare global {
    interface Window {
        VendorDisplaySDK?: {
            init(config: Record<string, unknown>): Promise<boolean>
            pushData(type: string, payload: string): void
            shutdown(): void
            isReady(): boolean
        }
    }
}

export class VendorIntegratedDriver implements DisplayDriver {
    readonly id = 'vendor-integrated'
    readonly name = 'Vendor Integrated Display'
    readonly mode = 'VENDOR_INTEGRATED'
    readonly isLocal = true  // Vendor SDK — direct hardware, highest priority


    private connected = false

    async connect(config: DriverConfig): Promise<void> {
        if (typeof window === 'undefined' || !window.VendorDisplaySDK) {
            throw new Error('Vendor display SDK not loaded')
        }
        const ok = await window.VendorDisplaySDK.init(config.protocolSettings || {})
        if (!ok) throw new Error('Vendor display initialization failed')
        this.connected = true
    }

    disconnect(): void {
        window.VendorDisplaySDK?.shutdown()
        this.connected = false
    }

    sendCart(cart: CartPayload): void {
        window.VendorDisplaySDK?.pushData('cart', JSON.stringify(cart))
    }

    showIdle(): void {
        window.VendorDisplaySDK?.pushData('idle', '{}')
    }

    showThankYou(customerName?: string, total?: number): void {
        window.VendorDisplaySDK?.pushData('thankyou', JSON.stringify({ customerName, total }))
    }

    async runTestPattern(): Promise<boolean> {
        if (!window.VendorDisplaySDK?.isReady()) return false
        window.VendorDisplaySDK.pushData('test', '{}')
        await new Promise(resolve => setTimeout(resolve, 2000))
        return true
    }

    isConnected(): boolean {
        return this.connected && typeof window !== 'undefined' && !!window.VendorDisplaySDK?.isReady()
    }
}
