import { hash } from 'bcryptjs'

/**
 * Hash a PIN for secure storage
 */
export async function hashPin(pin: string): Promise<string> {
    return hash(pin, 10)
}

/**
 * Validate PIN format
 * - Must be exactly 4 digits
 * - Cannot be all the same digit (e.g., "1111", "0000")
 */
export function validatePin(pin: string): { valid: boolean; error?: string } {
    if (!/^\d{4}$/.test(pin)) {
        return { valid: false, error: 'PIN must be exactly 4 digits' }
    }

    // Check for repeating patterns
    if (/^(\d)\1{3}$/.test(pin)) {
        return { valid: false, error: 'PIN cannot be all the same digit (e.g., 1111)' }
    }

    return { valid: true }
}
