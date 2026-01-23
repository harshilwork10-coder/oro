/**
 * Code Generation Utilities
 * Auto-generate secure, meaningful codes for locations and stations
 */

// Characters that are easy to read/type (no 0/O, 1/I confusion)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generate a random string of safe characters
 */
function randomChars(length: number): string {
    return Array.from({ length }, () =>
        SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
    ).join('')
}

/**
 * Generate a Pulse Store Code based on location name
 * Format: [BRAND]-[RANDOM4] e.g., "LIQUO-7X9K", "SALON-P3MQ"
 * - Takes first 5 characters of name (uppercase, cleaned)
 * - Adds dash and 4 random chars for security
 * - ~1.6 million combinations per prefix
 */
export function generateStoreCode(locationName: string, existingCodes: string[] = []): string {
    // Clean the name: uppercase, alphanumeric only, max 5 chars
    const cleaned = locationName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 5) || 'STORE'

    let attempts = 0
    let code: string

    do {
        const suffix = randomChars(4)
        code = `${cleaned}-${suffix}`
        attempts++
    } while (existingCodes.includes(code) && attempts < 100)

    return code
}

/**
 * Generate a Station Pairing Code
 * Format: 8 random alphanumeric chars (32^8 = ~1 trillion combinations)
 * - Secure: hard to guess
 * - No prefix: doesn't leak station number
 */
export function generateStationCode(stationNumber: number = 1, existingCodes: string[] = []): string {
    let attempts = 0
    let code: string

    do {
        code = randomChars(8) // 8 chars for security
        attempts++
    } while (existingCodes.includes(code) && attempts < 100)

    return code
}

/**
 * Generate a simple random code
 * For general use - easy to type
 */
export function generateSimpleCode(length: number = 6): string {
    return randomChars(length)
}

/**
 * Validate a store code format
 * Accepts both old (LIQUO01) and new (LIQUO-7X9K) formats
 */
export function isValidStoreCode(code: string): boolean {
    // New format: XXXXX-XXXX
    if (/^[A-Z0-9]{2,5}-[A-Z0-9]{4}$/.test(code)) return true
    // Old format: XXXXX## (legacy)
    if (/^[A-Z0-9]{2,8}$/.test(code)) return true
    return false
}

/**
 * Validate a station pairing code format
 * Accepts 8-char codes (new) and legacy S#-XXXX format
 */
export function isValidStationCode(code: string): boolean {
    // New format: 8 alphanumeric chars
    if (/^[A-Z0-9]{8}$/.test(code)) return true
    // Legacy format: S followed by number, dash, then 4 chars
    if (/^S\d+-[A-Z0-9]{4}$/.test(code)) return true
    return false
}

