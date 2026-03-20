/**
 * POS Display Broadcast — sends cart data to customer-facing display
 *
 * Uses BroadcastChannel API — zero API calls, zero network traffic.
 * The customer display runs on a secondary browser window/monitor
 * and receives updates instantly via cross-tab messaging.
 *
 * Usage in POS checkout:
 *   const display = new PosDisplayBroadcast()
 *   display.sendCartUpdate({ items, subtotal, tax, total })
 *   display.sendPaymentStarted()
 *   display.sendComplete('John Doe')
 *   display.reset() // back to idle
 */

interface CartItem {
    name: string
    quantity: number
    price: number
    total: number
}

interface DisplayState {
    items: CartItem[]
    subtotal: number
    tax: number
    total: number
    customerName?: string
    lastAction?: string
    status: 'IDLE' | 'ACTIVE' | 'PAYMENT' | 'COMPLETE'
}

export class PosDisplayBroadcast {
    private channel: BroadcastChannel

    constructor() {
        this.channel = new BroadcastChannel('pos-customer-display')
    }

    /** Send full cart state to display */
    sendCartUpdate(cart: { items: CartItem[]; subtotal: number; tax: number; total: number }): void {
        const state: DisplayState = {
            ...cart,
            status: 'ACTIVE',
            lastAction: 'ITEM_ADDED',
        }
        this.channel.postMessage(state)
    }

    /** Notify display that payment is processing */
    sendPaymentStarted(cart: { items: CartItem[]; subtotal: number; tax: number; total: number }): void {
        this.channel.postMessage({ ...cart, status: 'PAYMENT' })
    }

    /** Show thank-you screen */
    sendComplete(customerName?: string, total?: number): void {
        this.channel.postMessage({
            items: [], subtotal: 0, tax: 0, total: total || 0,
            customerName, status: 'COMPLETE'
        })
    }

    /** Reset to idle (promo screen) */
    reset(): void {
        this.channel.postMessage({
            items: [], subtotal: 0, tax: 0, total: 0, status: 'IDLE'
        })
    }

    /** Close the channel */
    close(): void {
        this.channel.close()
    }
}

export default PosDisplayBroadcast
