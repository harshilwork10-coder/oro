/**
 * Field-Level Encryption Utility
 * AES-256-GCM encryption for PCI DSS compliance
 * 
 * PCI DSS Requirements Addressed:
 * - Req 3.4: Render PAN unreadable using strong cryptography
 * - Req 3.5: Protect cryptographic keys
 * - Req 3.6: Key management procedures
 */

import * as crypto from 'crypto'

// Algorithm: AES-256-GCM (authenticated encryption)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits

/**
 * Get encryption key from environment
 * In production, use a proper key management service (AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY

    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required for PCI compliance')
    }

    // Key should be 32 bytes (256 bits) for AES-256
    // If it's a hex string, convert it
    if (key.length === 64) {
        return Buffer.from(key, 'hex')
    }

    // If it's shorter, derive a key using PBKDF2
    return crypto.pbkdf2Sync(key, 'pci-dss-salt', 100000, 32, 'sha256')
}

/**
 * Encrypt sensitive data (PCI DSS Req 3.4)
 * Returns: iv:authTag:encryptedData (all base64)
 */
export function encryptField(plaintext: string): string {
    if (!plaintext) return ''

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    })

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Format: iv:authTag:encryptedData (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt sensitive data
 */
export function decryptField(ciphertext: string): string {
    if (!ciphertext) return ''

    // Check if it's encrypted (contains our delimiter)
    if (!ciphertext.includes(':')) {
        // Return as-is if not encrypted (for migration compatibility)
        return ciphertext
    }

    try {
        const key = getEncryptionKey()
        const [ivBase64, authTagBase64, encryptedData] = ciphertext.split(':')

        const iv = Buffer.from(ivBase64, 'base64')
        const authTag = Buffer.from(authTagBase64, 'base64')

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        })

        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    } catch (error) {
        console.error('[ENCRYPTION] Decryption failed:', error)
        throw new Error('Failed to decrypt data - possible tampering detected')
    }
}

/**
 * Encrypt a card number for storage
 * Only stores last 4 digits in clear text for display
 */
export function encryptCardNumber(cardNumber: string): { encrypted: string; lastFour: string } {
    const cleaned = cardNumber.replace(/\D/g, '')
    const lastFour = cleaned.slice(-4)
    const encrypted = encryptField(cleaned)

    return { encrypted, lastFour }
}

/**
 * Mask a card number for display (PCI DSS Req 3.3)
 * Shows only first 6 and last 4 digits
 */
export function maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '')
    if (cleaned.length < 13) return '****'

    const firstSix = cleaned.slice(0, 6)
    const lastFour = cleaned.slice(-4)
    const masked = '*'.repeat(cleaned.length - 10)

    return `${firstSix}${masked}${lastFour}`
}

/**
 * Hash sensitive data for searching (one-way)
 * Use this when you need to search encrypted data
 */
export function hashForSearch(data: string): string {
    const salt = process.env.ENCRYPTION_KEY || 'default-salt'
    return crypto.createHmac('sha256', salt).update(data.toLowerCase()).digest('hex')
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a cryptographically secure encryption key
 * Run this once to generate your ENCRYPTION_KEY
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Rotate encryption key (for key management)
 * Re-encrypts data with a new key
 */
export function reEncrypt(ciphertext: string, newKey: Buffer, oldKey: Buffer): string {
    // Decrypt with old key
    const [ivBase64, authTagBase64, encryptedData] = ciphertext.split(':')
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    const decipher = crypto.createDecipheriv(ALGORITHM, oldKey, iv, {
        authTagLength: AUTH_TAG_LENGTH
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    // Re-encrypt with new key
    const newIv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, newKey, newIv, {
        authTagLength: AUTH_TAG_LENGTH
    })

    let encrypted = cipher.update(decrypted, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const newAuthTag = cipher.getAuthTag()

    return `${newIv.toString('base64')}:${newAuthTag.toString('base64')}:${encrypted}`
}

// Export types for TypeScript
export type EncryptedField = string

