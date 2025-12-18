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
 * Format: S[STATION#]-[RANDOM4] e.g., "S1-ABC7", "S2-XY9Z"
 * - Easy to read/type
 * - 7-8 characters total
 */
export function generateStationCode(stationNumber: number = 1, existingCodes: string[] = []): string {
    let attempts = 0
    let code: string

    do {
        const random = randomChars(4)
        code = `S${stationNumber}-${random}`
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
 */
export function isValidStationCode(code: string): boolean {
    // S followed by number, dash, then 4 chars
    return /^S\d+-[A-Z0-9]{4}$/.test(code) || /^[A-Z0-9]{4,8}$/.test(code)
}
