import { prisma } from './prisma'

/**
 * Generate a sequential invoice number for the current date
 * Format: YYYYMMDD-XXX (e.g., "20251128-001", "20251128-002")
 * Resets daily for easy IRS auditing and sequential tracking
 * 
 * @param franchiseId - The franchise ID to generate invoice for
 * @returns Promise<string> Sequential invoice number
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
        // Extract sequence number from format "YYYYMMDD-XXX"
        const parts = lastInvoice.split('-')
        if (parts.length === 2 && parts[0] === dateStr) {
            sequence = parseInt(parts[1]) + 1
        }
    }

    // Format: YYYYMMDD-XXX (pad sequence to 3 digits)
    return `${dateStr}-${sequence.toString().padStart(3, '0')}`
}

/**
 * Extract just the sequence number from a full invoice number for PAX terminal
 * Example: "20251128-001" -> "001"
 * 
 * @param invoiceNumber - Full invoice number (YYYYMMDD-XXX)
 * @returns 3-digit sequence number
 */
export function getPaxInvoiceNumber(invoiceNumber: string): string {
    const parts = invoiceNumber.split('-')
    return parts[parts.length - 1] // Return just the sequence number (e.g., "001")
}

/**
 * Format invoice number for display on receipts
 * @param invoiceNumber - The invoice number
 * @returns Formatted invoice number with prefix
 */
export function formatInvoiceNumber(invoiceNumber: string): string {
    return `INV-${invoiceNumber}`
}
