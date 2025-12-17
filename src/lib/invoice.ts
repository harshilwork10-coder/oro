import { prisma } from './prisma'

/**
 * Generate a sequential invoice number for the current date
 * Format: YYYYMMDDXXX (e.g., "20251128001", "20251128002")
 * Pure numeric format for PAX terminal compatibility
 * Resets daily for easy IRS auditing and sequential tracking
 * 
 * @param franchiseId - The franchise ID to generate invoice for
 * @returns Promise<string> Sequential invoice number (purely numeric)
 */
export async function generateInvoiceNumber(franchiseId: string): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

    // Get today's transactions to find the highest sequence number
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    const todayTransactions = await prisma.transaction.findMany({
        where: {
            franchiseId,
            createdAt: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        select: {
            invoiceNumber: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 1
    })

    let sequence = 1

    if (todayTransactions.length > 0 && todayTransactions[0].invoiceNumber) {
        const lastInvoice = todayTransactions[0].invoiceNumber
        // Extract sequence number from format "YYYYMMDDXXX"
        // The last 3 digits are the sequence
        const lastSeq = parseInt(lastInvoice.slice(-3))
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1
        }
    }

    // Format: YYYYMMDDXXX (pure numeric, pad sequence to 3 digits)
    return `${dateStr}${sequence.toString().padStart(3, '0')}`
}

/**
 * Extract just the sequence number from a full invoice number for PAX terminal
 * Example: "20251128001" -> "001"
 * 
 * @param invoiceNumber - Full invoice number (YYYYMMDDXXX)
 * @returns 3-digit sequence number
 */
export function getPaxInvoiceNumber(invoiceNumber: string): string {
    // Return last 3 digits (the sequence)
    return invoiceNumber.slice(-3)
}

/**
 * Format invoice number for display on receipts
 * @param invoiceNumber - The invoice number
 * @returns Formatted invoice number with prefix
 */
export function formatInvoiceNumber(invoiceNumber: string): string {
    // Format as INV-YYYYMMDD-XXX for display
    if (invoiceNumber.length === 11) {
        const date = invoiceNumber.slice(0, 8)
        const seq = invoiceNumber.slice(8)
        return `INV-${date}-${seq}`
    }
    return `INV-${invoiceNumber}`
}

