// @ts-nocheck
/**
 * Cash Drawer Module
 * Opens cash drawer via ESC/POS command through receipt printer
 *
 * Most cash drawers are connected through the receipt printer's RJ-12 kick port.
 * The printer receives an ESC/POS command and sends a 24V pulse to open the drawer.
 *
 * Also supports USB-direct drawers via Web Serial API.
 */

export interface CashDrawerConfig {
    /** Connection method */
    connection: 'PRINTER_KICK' | 'USB_SERIAL'
    /** Kick connector pin (1 or 2 — most drawers use pin 2) */
    kickPin: 1 | 2
    /** Pulse ON time in ms (default: 100) */
    pulseOnTime: number
    /** Pulse OFF time in ms (default: 100) */
    pulseOffTime: number
}

const DEFAULT_CONFIG: CashDrawerConfig = {
    connection: 'PRINTER_KICK',
    kickPin: 2,
    pulseOnTime: 100,
    pulseOffTime: 100,
}

export class CashDrawer {
    private config: CashDrawerConfig
    private port: SerialPort | null = null

    constructor(config: Partial<CashDrawerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Generate ESC/POS kick command
     *
     * ESC p m t1 t2
     * - ESC (0x1B) p (0x70): Cash drawer kick command
     * - m: Pin selector (0x00 = pin 2, 0x01 = pin 5)
     * - t1: Pulse ON time (t1 × 2ms)
     * - t2: Pulse OFF time (t2 × 2ms)
     */
    generateKickCommand(): Uint8Array {
        const pin = this.config.kickPin === 1 ? 0x00 : 0x01
        const pulseOn = Math.round(this.config.pulseOnTime / 2)
        const pulseOff = Math.round(this.config.pulseOffTime / 2)

        return new Uint8Array([
            0x1B, 0x70,  // ESC p
            pin,         // Pin selector
            pulseOn,     // ON time
            pulseOff,    // OFF time
        ])
    }

    /**
     * Open drawer by sending ESC/POS command through receipt printer
     * This is the most common method — the drawer is connected via the printer's RJ-12 port
     */
    async openViaPrinter(printerEndpoint: string = '/api/hardware/cash-drawer'): Promise<boolean> {
        try {
            const res = await fetch(printerEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: Array.from(this.generateKickCommand()),
                    pin: this.config.kickPin,
                })
            })
            return res.ok
        } catch (err) {
            console.error('Cash drawer kick failed:', err)
            return false
        }
    }

    /** Open drawer via direct USB Serial connection */
    async openViaSerial(): Promise<boolean> {
        if (!('serial' in navigator)) {
            console.warn('Web Serial not supported')
            return false
        }

        try {
            if (!this.port) {
                this.port = await (navigator as any).serial.requestPort()
                await this.port!.open({ baudRate: 9600 })
            }

            const writer = this.port!.writable!.getWriter()
            await writer.write(this.generateKickCommand())
            writer.releaseLock()
            return true
        } catch (err) {
            console.error('USB cash drawer open failed:', err)
            return false
        }
    }

    /** Open drawer using configured connection method */
    async open(): Promise<boolean> {
        if (this.config.connection === 'USB_SERIAL') {
            return this.openViaSerial()
        }
        return this.openViaPrinter()
    }

    /** Disconnect USB serial port */
    async disconnect(): Promise<void> {
        if (this.port) {
            try { await this.port.close() } catch { }
            this.port = null
        }
    }
}

export default CashDrawer
