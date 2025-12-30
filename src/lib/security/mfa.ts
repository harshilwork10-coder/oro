/**
 * Multi-Factor Authentication (MFA) Utility
 * TOTP-based 2FA using RFC 6238
 * 
 * Features:
 * - Time-based One-Time Password (TOTP)
 * - QR code generation for authenticator apps
 * - Backup codes for account recovery
 * - Encrypted secret storage
 */

import { authenticator } from 'otplib'
import * as QRCode from 'qrcode'
import * as crypto from 'crypto'
import { encryptField, decryptField } from './encryption'

// Configure authenticator
authenticator.options = {
    digits: 6,
    step: 30, // 30 second window
    window: 1  // Allow 1 step before/after for clock drift
}

const APP_NAME = 'OroNext POS'

export interface MFASetupResult {
    secret: string           // Encrypted secret for storage
    qrCodeDataUrl: string    // QR code image as data URL
    backupCodes: string[]    // Plain text backup codes (show once)
    encryptedBackupCodes: string // Encrypted backup codes for storage
}

export interface MFAVerifyResult {
    valid: boolean
    usedBackupCode?: boolean
}

/**
 * Generate MFA secret and QR code for setup
 */
export async function generateMFASetup(
    userEmail: string
): Promise<MFASetupResult> {
    // Generate secret
    const secret = authenticator.generateSecret()

    // Generate OTP Auth URL for authenticator apps
    const otpAuthUrl = authenticator.keyuri(userEmail, APP_NAME, secret)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: 'M',
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    })

    // Generate backup codes
    const backupCodes = generateBackupCodes(8)

    // Encrypt secret and backup codes for storage
    const encryptedSecret = encryptField(secret)
    const encryptedBackupCodes = encryptField(JSON.stringify(backupCodes))

    return {
        secret: encryptedSecret,
        qrCodeDataUrl,
        backupCodes,
        encryptedBackupCodes
    }
}

/**
 * Verify MFA token
 */
export function verifyMFAToken(
    token: string,
    encryptedSecret: string
): boolean {
    try {
        const secret = decryptField(encryptedSecret)
        return authenticator.check(token, secret)
    } catch (error) {
        console.error('[MFA] Token verification failed:', error)
        return false
    }
}

/**
 * Verify MFA token OR backup code
 */
export function verifyMFAWithBackup(
    token: string,
    encryptedSecret: string,
    encryptedBackupCodes: string | null
): MFAVerifyResult {
    // First try TOTP token
    if (token.length === 6 && /^\d{6}$/.test(token)) {
        const valid = verifyMFAToken(token, encryptedSecret)
        if (valid) {
            return { valid: true, usedBackupCode: false }
        }
    }

    // Try backup code (format: XXXX-XXXX)
    if (encryptedBackupCodes && token.length === 9 && token.includes('-')) {
        const backupCodes = JSON.parse(decryptField(encryptedBackupCodes)) as string[]
        const index = backupCodes.indexOf(token.toUpperCase())

        if (index !== -1) {
            // Mark code as used (return updated codes)
            return { valid: true, usedBackupCode: true }
        }
    }

    return { valid: false }
}

/**
 * Remove used backup code and return updated encrypted codes
 */
export function removeUsedBackupCode(
    usedCode: string,
    encryptedBackupCodes: string
): string {
    const backupCodes = JSON.parse(decryptField(encryptedBackupCodes)) as string[]
    const filteredCodes = backupCodes.filter(code => code !== usedCode.toUpperCase())
    return encryptField(JSON.stringify(filteredCodes))
}

/**
 * Generate secure backup codes
 */
function generateBackupCodes(count: number): string[] {
    const codes: string[] = []

    for (let i = 0; i < count; i++) {
        // Generate format: XXXX-XXXX (alphanumeric, easy to type)
        const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
        const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
        codes.push(`${part1}-${part2}`)
    }

    return codes
}

/**
 * Regenerate backup codes (when user runs out)
 */
export function regenerateBackupCodes(): {
    backupCodes: string[],
    encryptedBackupCodes: string
} {
    const backupCodes = generateBackupCodes(8)
    const encryptedBackupCodes = encryptField(JSON.stringify(backupCodes))

    return { backupCodes, encryptedBackupCodes }
}

/**
 * Get remaining backup codes count
 */
export function getBackupCodesCount(encryptedBackupCodes: string | null): number {
    if (!encryptedBackupCodes) return 0

    try {
        const codes = JSON.parse(decryptField(encryptedBackupCodes)) as string[]
        return codes.length
    } catch {
        return 0
    }
}

/**
 * Check if MFA should be required based on role
 */
export function isMFARequiredForRole(role: string): boolean {
    // Roles that REQUIRE MFA
    const mfaRequiredRoles = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE']
    return mfaRequiredRoles.includes(role)
}

/**
 * Check if MFA is recommended (but not required)
 */
export function isMFARecommendedForRole(role: string): boolean {
    const mfaRecommendedRoles = ['MANAGER']
    return mfaRecommendedRoles.includes(role)
}

