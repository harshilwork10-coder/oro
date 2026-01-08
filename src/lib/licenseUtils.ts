/**
 * Generate a unique license key in the format: ORO-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
    const segments: string[] = []

    for (let i = 0; i < 3; i++) {
        // Generate random 4-character alphanumeric segment
        const segment = Math.random().toString(36).substring(2, 6).toUpperCase()
        segments.push(segment)
    }

    return `ORO-${segments.join('-')}`
}

/**
 * Example outputs:
 * - ORO-X7K9-P2M4-Q8N3
 * - ORO-A1B2-C3D4-E5F6
 * - ORO-9Z8Y-7X6W-5V4U
 */

