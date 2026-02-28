/**
 * Barcode Scanner Module
 * Handles USB HID barcode scanners in keyboard wedge mode
 *
 * Most retail barcode scanners work as keyboard devices — they "type" the barcode
 * followed by Enter. This module detects rapid keystroke sequences (< 50ms between keys)
 * to distinguish scanner input from human typing.
 */

export interface ScanResult {
    barcode: string
    type: 'UPC-A' | 'UPC-E' | 'EAN-13' | 'EAN-8' | 'CODE-128' | 'CODE-39' | 'QR' | 'UNKNOWN'
    timestamp: Date
}

export interface ScannerConfig {
    /** Max ms between keystrokes to be considered scanner input (default: 50ms) */
    maxKeystrokeInterval: number
    /** Min barcode length to accept (default: 4) */
    minLength: number
    /** Max barcode length to accept (default: 48 for QR codes) */
    maxLength: number
    /** Character that terminates scan (default: Enter) */
    terminatorKey: string
    /** Prefix characters to strip (some scanners add these) */
    prefixToStrip: string[]
    /** Suffix characters to strip */
    suffixToStrip: string[]
}

const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
    maxKeystrokeInterval: 50,
    minLength: 4,
    maxLength: 48,
    terminatorKey: 'Enter',
    prefixToStrip: [],
    suffixToStrip: [],
}

export class BarcodeScanner {
    private config: ScannerConfig
    private buffer: string = ''
    private lastKeystrokeTime: number = 0
    private onScan: ((result: ScanResult) => void) | null = null
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null
    private active = false
    private timeoutId: ReturnType<typeof setTimeout> | null = null

    constructor(config: Partial<ScannerConfig> = {}) {
        this.config = { ...DEFAULT_SCANNER_CONFIG, ...config }
    }

    /** Start listening for barcode scans */
    startListening(callback: (result: ScanResult) => void): void {
        if (this.active) return
        this.onScan = callback
        this.active = true

        this.keydownHandler = (e: KeyboardEvent) => {
            const now = Date.now()
            const timeSinceLastKey = now - this.lastKeystrokeTime

            // If too much time has passed, start a new buffer
            if (timeSinceLastKey > this.config.maxKeystrokeInterval && this.buffer.length > 0) {
                this.buffer = ''
            }

            if (e.key === this.config.terminatorKey) {
                // Scanner finished — check if this looks like a scanner input
                if (this.buffer.length >= this.config.minLength && this.buffer.length <= this.config.maxLength) {
                    // Prevent the Enter from triggering form submission
                    e.preventDefault()
                    e.stopPropagation()

                    const barcode = this.cleanBarcode(this.buffer)
                    const type = this.detectBarcodeType(barcode)

                    if (this.onScan) {
                        this.onScan({ barcode, type, timestamp: new Date() })
                    }
                }
                this.buffer = ''
            } else if (e.key.length === 1) {
                // Single character — add to buffer
                this.buffer += e.key
            }

            this.lastKeystrokeTime = now

            // Auto-clear buffer after timeout (in case Enter never comes)
            if (this.timeoutId) clearTimeout(this.timeoutId)
            this.timeoutId = setTimeout(() => { this.buffer = '' }, 200)
        }

        document.addEventListener('keydown', this.keydownHandler, { capture: true })
    }

    /** Stop listening */
    stopListening(): void {
        this.active = false
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, { capture: true })
            this.keydownHandler = null
        }
        if (this.timeoutId) clearTimeout(this.timeoutId)
        this.buffer = ''
    }

    /** Clean barcode by stripping prefix/suffix */
    private cleanBarcode(barcode: string): string {
        let cleaned = barcode
        for (const prefix of this.config.prefixToStrip) {
            if (cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length)
        }
        for (const suffix of this.config.suffixToStrip) {
            if (cleaned.endsWith(suffix)) cleaned = cleaned.slice(0, -suffix.length)
        }
        return cleaned
    }

    /** Detect barcode format based on length and content */
    private detectBarcodeType(barcode: string): ScanResult['type'] {
        const isNumericOnly = /^\d+$/.test(barcode)

        if (isNumericOnly) {
            switch (barcode.length) {
                case 12: return 'UPC-A'
                case 8: return 'UPC-E'
                case 13: return 'EAN-13'
            }
            if (barcode.length === 8 && barcode.startsWith('0')) return 'EAN-8'
        }

        // CODE-39 allows A-Z, 0-9, and some special chars
        if (/^[A-Z0-9\-\.\ \$\/\+\%]+$/i.test(barcode) && barcode.length <= 43) return 'CODE-39'

        // CODE-128 supports full ASCII
        if (barcode.length >= 1 && barcode.length <= 48) return 'CODE-128'

        // Long alphanumeric — likely QR
        if (barcode.length > 20) return 'QR'

        return 'UNKNOWN'
    }

    /** Validate UPC-A check digit */
    static validateUPC(barcode: string): boolean {
        if (barcode.length !== 12 || !/^\d+$/.test(barcode)) return false
        const digits = barcode.split('').map(Number)
        const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
        return sum % 10 === 0
    }

    /** Generate UPC-A check digit */
    static generateCheckDigit(barcode11: string): string {
        if (barcode11.length !== 11 || !/^\d+$/.test(barcode11)) throw new Error('Need 11-digit UPC base')
        const digits = barcode11.split('').map(Number)
        const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
        const checkDigit = (10 - (sum % 10)) % 10
        return barcode11 + checkDigit
    }
}

export default BarcodeScanner
