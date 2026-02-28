/**
 * Scale Integration Module
 * Supports USB/Serial commercial scales (CAS, Mettler Toledo, Fairbanks Scales)
 *
 * Web Serial API based — works in Chrome/Edge.
 * Falls back to keyboard wedge (manual weight entry) when serial unavailable.
 */

export interface ScaleReading {
    weight: number
    unit: 'lb' | 'kg' | 'oz'
    stable: boolean
    timestamp: Date
}

export interface ScaleConfig {
    protocol: 'CAS' | 'METTLER_TOLEDO' | 'FAIRBANKS' | 'GENERIC'
    baudRate: number
    dataBits: number
    stopBits: number
    parity: 'none' | 'even' | 'odd'
    unit: 'lb' | 'kg' | 'oz'
}

const DEFAULT_CONFIG: ScaleConfig = {
    protocol: 'CAS',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    unit: 'lb',
}

export class ScaleIntegration {
    private port: SerialPort | null = null
    private reader: ReadableStreamDefaultReader | null = null
    private config: ScaleConfig
    private onReading: ((reading: ScaleReading) => void) | null = null
    private running = false

    constructor(config: Partial<ScaleConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /** Check if Web Serial API is available */
    static isSupported(): boolean {
        return 'serial' in navigator
    }

    /** Connect to scale via Web Serial API */
    async connect(): Promise<boolean> {
        if (!ScaleIntegration.isSupported()) {
            console.warn('Web Serial API not supported — use manual weight entry')
            return false
        }

        try {
            this.port = await (navigator as any).serial.requestPort()
            await this.port!.open({
                baudRate: this.config.baudRate,
                dataBits: this.config.dataBits,
                stopBits: this.config.stopBits,
                parity: this.config.parity,
            })
            return true
        } catch (err) {
            console.error('Scale connection failed:', err)
            return false
        }
    }

    /** Start continuous reading from scale */
    async startReading(callback: (reading: ScaleReading) => void): Promise<void> {
        if (!this.port?.readable) throw new Error('Scale not connected')

        this.onReading = callback
        this.running = true
        this.reader = this.port.readable.getReader()

        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (this.running) {
                const { value, done } = await this.reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Parse based on protocol
                const lines = buffer.split(/[\r\n]+/)
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const reading = this.parseLine(line.trim())
                    if (reading && this.onReading) {
                        this.onReading(reading)
                    }
                }
            }
        } catch (err) {
            if (this.running) console.error('Scale read error:', err)
        }
    }

    /** Parse a single line from the scale based on protocol */
    private parseLine(line: string): ScaleReading | null {
        if (!line) return null

        switch (this.config.protocol) {
            case 'CAS': return this.parseCAS(line)
            case 'METTLER_TOLEDO': return this.parseMettlerToledo(line)
            case 'FAIRBANKS': return this.parseFairbanks(line)
            default: return this.parseGeneric(line)
        }
    }

    /** CAS scale format: "ST,GS,+  0.00 lb" or "ST,NT,+  0.00 lb" */
    private parseCAS(line: string): ScaleReading | null {
        const match = line.match(/(ST|US),(GS|NT),([+-])\s*(\d+\.?\d*)\s*(lb|kg|oz)/)
        if (!match) return null
        return {
            weight: parseFloat(match[4]) * (match[3] === '-' ? -1 : 1),
            unit: match[5] as 'lb' | 'kg' | 'oz',
            stable: match[1] === 'ST',
            timestamp: new Date(),
        }
    }

    /** Mettler Toledo format: "S S     0.00 lb" (stable) or "S D     0.00 lb" (dynamic) */
    private parseMettlerToledo(line: string): ScaleReading | null {
        const match = line.match(/S\s+([SD])\s+(-?\d+\.?\d*)\s*(lb|kg|oz|g)/)
        if (!match) return null
        return {
            weight: parseFloat(match[2]),
            unit: (match[3] === 'g' ? 'oz' : match[3]) as 'lb' | 'kg' | 'oz',
            stable: match[1] === 'S',
            timestamp: new Date(),
        }
    }

    /** Fairbanks format: "  0.00LB" */
    private parseFairbanks(line: string): ScaleReading | null {
        const match = line.match(/(-?\d+\.?\d*)\s*(LB|KG|OZ)/i)
        if (!match) return null
        return {
            weight: parseFloat(match[1]),
            unit: match[2].toLowerCase() as 'lb' | 'kg' | 'oz',
            stable: true,
            timestamp: new Date(),
        }
    }

    /** Generic fallback — look for any number followed by unit */
    private parseGeneric(line: string): ScaleReading | null {
        const match = line.match(/(-?\d+\.?\d*)\s*(lb|kg|oz)/i)
        if (!match) return null
        return {
            weight: parseFloat(match[1]),
            unit: match[2].toLowerCase() as 'lb' | 'kg' | 'oz',
            stable: true,
            timestamp: new Date(),
        }
    }

    /** Request a single weight reading (sends weight request command) */
    async requestWeight(): Promise<void> {
        if (!this.port?.writable) return
        const writer = this.port.writable.getWriter()
        const commands: Record<string, string> = {
            'CAS': 'W\r\n',
            'METTLER_TOLEDO': 'SI\r\n',
            'FAIRBANKS': 'W\r\n',
            'GENERIC': 'P\r\n',
        }
        await writer.write(new TextEncoder().encode(commands[this.config.protocol]))
        writer.releaseLock()
    }

    /** Send zero/tare command */
    async tare(): Promise<void> {
        if (!this.port?.writable) return
        const writer = this.port.writable.getWriter()
        const commands: Record<string, string> = {
            'CAS': 'Z\r\n',
            'METTLER_TOLEDO': 'TA\r\n',
            'FAIRBANKS': 'Z\r\n',
            'GENERIC': 'T\r\n',
        }
        await writer.write(new TextEncoder().encode(commands[this.config.protocol]))
        writer.releaseLock()
    }

    /** Stop reading and disconnect */
    async disconnect(): Promise<void> {
        this.running = false
        if (this.reader) { try { await this.reader.cancel() } catch { } }
        if (this.port) { try { await this.port.close() } catch { } }
        this.port = null
        this.reader = null
    }
}

export default ScaleIntegration
