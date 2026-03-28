/**
 * DisplayDriver Interface
 *
 * Every display adapter implements this contract. The CustomerDisplayManager
 * delegates all hardware-specific work to the active driver.
 *
 * LOCAL vs REMOTE:
 *   isLocal=true  → Driver updates the display via local transport
 *                    (BroadcastChannel, JS bridge, localhost serial agent).
 *                    No server API round-trip for rendering.
 *   isLocal=false → Driver updates the display via server API.
 *                    Used ONLY when the display is on a different machine.
 */

import type { CartPayload, DriverConfig } from '../types'

export interface DisplayDriver {
    /** Unique driver identifier, e.g. "second-screen", "pole-epson-vfd" */
    readonly id: string

    /** Human-readable name, e.g. "Secondary Screen (BroadcastChannel)" */
    readonly name: string

    /** The DisplayMode enum value this driver handles */
    readonly mode: string

    /**
     * TRUE = local transport (BroadcastChannel, JS bridge, serial agent).
     *        Display renders from local events, never from backend round-trips.
     * FALSE = remote transport (HTTP API). Only used for off-machine displays.
     */
    readonly isLocal: boolean

    /** Open connection to the display hardware */
    connect(config: DriverConfig): Promise<void>

    /** Tear down connection */
    disconnect(): void

    /** Push current cart state to the display */
    sendCart(cart: CartPayload): void

    /** Show idle / welcome / promo screen */
    showIdle(): void

    /** Show thank-you screen after completed sale */
    showThankYou(customerName?: string, total?: number): void

    /** Run a visual test pattern so user can confirm the right display */
    runTestPattern(): Promise<boolean>

    /** Check if driver is currently connected */
    isConnected(): boolean
}
