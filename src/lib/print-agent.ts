/**
 * Print Agent Client Library
 * Communicates with local ORO Print Agent for thermal receipt printing
 */

const PRINT_AGENT_URL = 'http://localhost:9100';

export interface ReceiptData {
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    transactionId?: string;
    date?: string;
    cashier?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;
    paymentMethod?: string;
    amountPaid?: number;
    change?: number;
    barcode?: string;
    footer?: string;
    openDrawer?: boolean;
}

export interface PrintAgentStatus {
    status: string;
    version: string;
    usbAvailable: boolean;
}

export interface PrinterInfo {
    vendorId: number;
    productId: number;
    name: string;
}

/**
 * Check if print agent is running
 */
export async function isPrintAgentAvailable(): Promise<boolean> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get print agent status
 */
export async function getPrintAgentStatus(): Promise<PrintAgentStatus | null> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/status`);
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Get list of connected USB printers
 */
export async function getConnectedPrinters(): Promise<PrinterInfo[]> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/printers`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.printers || [];
    } catch {
        return [];
    }
}

/**
 * Print a receipt to the thermal printer
 */
export async function printReceipt(receipt: ReceiptData): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt })
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Print failed' };
        }

        return { success: true, message: result.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Cannot connect to print agent' };
    }
}

/**
 * Open the cash drawer
 */
export async function openCashDrawer(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/drawer`, {
            method: 'POST'
        });

        if (!response.ok) {
            const result = await response.json();
            return { success: false, error: result.error };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Cannot connect to print agent' };
    }
}

/**
 * Print a test page
 */
export async function printTestPage(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${PRINT_AGENT_URL}/test`, {
            method: 'POST'
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Test print failed' };
        }

        return { success: true, message: result.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Cannot connect to print agent' };
    }
}

/**
 * Convert transaction data to receipt format
 */
export function formatReceiptFromTransaction(
    transaction: any,
    storeInfo: { name: string; address?: string; phone?: string },
    cashierName?: string
): ReceiptData {
    return {
        storeName: storeInfo.name,
        storeAddress: storeInfo.address,
        storePhone: storeInfo.phone,
        transactionId: transaction.id || transaction.transactionNumber,
        date: new Date(transaction.createdAt || Date.now()).toLocaleString(),
        cashier: cashierName,
        items: (transaction.items || []).map((item: any) => ({
            name: item.name || item.productName,
            quantity: item.quantity,
            price: Number(item.price || item.unitPrice),
            total: Number(item.total || item.lineTotal)
        })),
        subtotal: Number(transaction.subtotal || 0),
        tax: Number(transaction.tax || 0),
        discount: Number(transaction.discount || 0),
        total: Number(transaction.total || transaction.grandTotal || 0),
        paymentMethod: transaction.paymentMethod || transaction.paymentType,
        amountPaid: Number(transaction.amountPaid || transaction.total || 0),
        change: Number(transaction.change || 0),
        barcode: transaction.id || transaction.transactionNumber,
        openDrawer: transaction.paymentMethod === 'CASH'
    };
}

// ============ LABEL PRINTING (Zebra ZPL) ============

export interface LabelData {
    productName: string;
    price: number;
    barcode?: string;
    brand?: string;
    size?: '2x1' | '1.5x1' | '1x1';
    quantity?: number;
}

/**
 * Print a single price label (Zebra ZPL)
 */
export async function printLabel(label: LabelData, agentUrl = PRINT_AGENT_URL): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${agentUrl}/print-label`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label })
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Label print failed' };
        }

        return { success: true, message: result.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Cannot connect to print agent' };
    }
}

/**
 * Print multiple labels at once (batch)
 */
export async function printLabels(labels: LabelData[], agentUrl = PRINT_AGENT_URL): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${agentUrl}/print-labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ labels })
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Batch label print failed' };
        }

        return { success: true, message: result.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Cannot connect to print agent' };
    }
}

// ============ PRINTER ROUTING ============

export interface PrinterConfig {
    id: string;
    name: string;
    type: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL';
    printerLang: 'ESCPOS' | 'ZPL';
    agentUrl: string;
    isDefault: boolean;
    isActive: boolean;
    stationId?: string;
    labelWidth?: string;
}

/**
 * Get configured printers from API
 */
export async function getConfiguredPrinters(): Promise<PrinterConfig[]> {
    try {
        const response = await fetch('/api/settings/printers');
        if (!response.ok) return [];
        const data = await response.json();
        return data.printers || [];
    } catch {
        return [];
    }
}

/**
 * Get printers by type
 */
export async function getPrintersByType(type: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL'): Promise<PrinterConfig[]> {
    const printers = await getConfiguredPrinters();
    return printers.filter(p => p.type === type && p.isActive);
}

/**
 * Get default printer for a type
 */
export async function getDefaultPrinter(type: 'RECEIPT' | 'KITCHEN' | 'BAR' | 'LABEL'): Promise<PrinterConfig | null> {
    const printers = await getPrintersByType(type);
    return printers.find(p => p.isDefault) || printers[0] || null;
}

/**
 * Print receipt to configured receipt printer
 */
export async function printReceiptToConfigured(receipt: ReceiptData): Promise<{ success: boolean; error?: string }> {
    const printer = await getDefaultPrinter('RECEIPT');

    if (!printer) {
        // Fallback to localhost
        return printReceipt(receipt);
    }

    try {
        const response = await fetch(`${printer.agentUrl}/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt })
        });

        if (!response.ok) {
            const result = await response.json();
            return { success: false, error: result.error };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Print to kitchen printer(s)
 */
export async function printKitchenOrder(orderData: any): Promise<{ success: boolean; printed: number; errors: string[] }> {
    const kitchenPrinters = await getPrintersByType('KITCHEN');
    const errors: string[] = [];
    let printed = 0;

    for (const printer of kitchenPrinters) {
        try {
            const response = await fetch(`${printer.agentUrl}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receipt: orderData })
            });

            if (response.ok) {
                printed++;
            } else {
                const result = await response.json();
                errors.push(`${printer.name}: ${result.error}`);
            }
        } catch (e: any) {
            errors.push(`${printer.name}: ${e.message}`);
        }
    }

    return { success: printed > 0, printed, errors };
}

/**
 * Print label to configured label printer
 */
export async function printLabelToConfigured(label: LabelData): Promise<{ success: boolean; error?: string }> {
    const printer = await getDefaultPrinter('LABEL');

    if (!printer) {
        return { success: false, error: 'No label printer configured' };
    }

    return printLabel(label, printer.agentUrl);
}

