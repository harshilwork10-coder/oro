/**
 * Label Printer Module
 * Generates ZPL (Zebra Programming Language) for label printers
 *
 * Supports: Zebra GK420d, LP2844, ZD220, Brother QL-series
 * Connection: USB via Web Serial or network via HTTP POST
 */

export interface LabelData {
    barcode: string
    name: string
    price: number
    sku?: string
    description?: string
    weight?: string
    department?: string
}

export interface LabelConfig {
    width: number    // dots (203 DPI: 1 inch = 203 dots)
    height: number
    dpi: 203 | 300
    format: 'ZPL' | 'EPL'
}

const DEFAULT_LABEL_CONFIG: LabelConfig = {
    width: 406,  // 2 inch
    height: 203, // 1 inch
    dpi: 203,
    format: 'ZPL',
}

export class LabelPrinter {
    private config: LabelConfig

    constructor(config: Partial<LabelConfig> = {}) {
        this.config = { ...DEFAULT_LABEL_CONFIG, ...config }
    }

    /** Generate ZPL code for a product label */
    generateProductLabel(data: LabelData): string {
        const { barcode, name, price, sku, department } = data
        const priceStr = `$${price.toFixed(2)}`

        return [
            '^XA',                                          // Start format
            '^CF0,22',                                      // Default font size
            `^FO20,15^FD${name.substring(0, 30)}^FS`,      // Product name
            `^FO20,45^A0N,18,18^FD${sku || ''}^FS`,        // SKU
            department ? `^FO20,70^A0N,16,16^FD${department}^FS` : '',
            `^FO20,95^BY2^BCN,50,N,N,N^FD${barcode}^FS`,   // Barcode
            `^FO20,155^A0N,16,16^FD${barcode}^FS`,         // Barcode number
            `^FO${this.config.width - 120},15^A0N,32,32^FR^FD${priceStr}^FS`, // Price (right aligned)
            '^XZ',                                          // End format
        ].filter(Boolean).join('\n')
    }

    /** Generate shelf label (wider, includes more info) */
    generateShelfLabel(data: LabelData): string {
        const { barcode, name, price, sku, description, weight } = data
        const priceStr = `$${price.toFixed(2)}`

        return [
            '^XA',
            '^CF0,18',
            `^FO10,10^A0N,24,24^FD${name.substring(0, 40)}^FS`,
            description ? `^FO10,40^A0N,14,14^FD${description.substring(0, 50)}^FS` : '',
            weight ? `^FO10,60^A0N,14,14^FD${weight}^FS` : '',
            `^FO10,80^BY2^BCN,40,N,N,N^FD${barcode}^FS`,
            `^FO10,130^A0N,14,14^FD${barcode}  ${sku || ''}^FS`,
            `^FO${this.config.width - 130},10^A0N,40,40^FR^FD${priceStr}^FS`,
            '^XZ',
        ].filter(Boolean).join('\n')
    }

    /** Generate batch of labels (multi-label print) */
    generateBatch(items: LabelData[], type: 'product' | 'shelf' = 'product'): string {
        const fn = type === 'shelf' ? this.generateShelfLabel.bind(this) : this.generateProductLabel.bind(this)
        return items.map(fn).join('\n')
    }

    /** Print via Web Serial API (USB-connected Zebra printer) */
    async printViaSerial(zpl: string): Promise<boolean> {
        if (!('serial' in navigator)) {
            console.warn('Web Serial not supported')
            return false
        }

        try {
            const port = await (navigator as any).serial.requestPort()
            await port.open({ baudRate: 9600 })
            const writer = port.writable.getWriter()
            await writer.write(new TextEncoder().encode(zpl))
            writer.releaseLock()
            await port.close()
            return true
        } catch (err) {
            console.error('Serial print failed:', err)
            return false
        }
    }

    /** Print via network (Zebra with network card / print server) */
    async printViaNetwork(zpl: string, printerIp: string, port = 9100): Promise<boolean> {
        try {
            const res = await fetch(`/api/hardware/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zpl, printerIp, port }),
            })
            return res.ok
        } catch (err) {
            console.error('Network print failed:', err)
            return false
        }
    }

    /** Download ZPL as file for manual printing */
    downloadZPL(zpl: string, filename = 'labels.zpl'): void {
        const blob = new Blob([zpl], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }
}

export default LabelPrinter
