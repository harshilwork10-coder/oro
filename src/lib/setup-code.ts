// Generate unique setup codes for terminal pairing
// Format: PREFIX-XXXX (e.g., MIKE-7K3P, STORE-A2B9)

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars (0, O, 1, I)

/**
 * Generates a random alphanumeric code of specified length
 */
function randomCode(length: number): string {
    let result = ''
    for (let i = 0; i < length; i++) {
        result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
    }
    return result
}

/**
 * Creates a setup code from business name
 * Format: PREFIX-XXXX where PREFIX is first 4 chars of business name (uppercase)
 */
export function generateSetupCode(businessName?: string): string {
    // Create prefix from business name or use TERM
    const prefix = businessName
        ? businessName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase().padEnd(4, 'X')
        : 'TERM'

    // Generate random 4-char suffix
    const suffix = randomCode(4)

    return `${prefix}-${suffix}`
}

/**
 * Generates a completely random setup code (no prefix)
 * Format: XXXX-XXXX
 */
export function generateRandomSetupCode(): string {
    return `${randomCode(4)}-${randomCode(4)}`
}

