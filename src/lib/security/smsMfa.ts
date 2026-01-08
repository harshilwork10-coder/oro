/**
 * SMS-Based MFA (Two-Factor Authentication via SMS)
 * 
 * Simpler alternative to TOTP authenticator apps.
 * Users receive a 6-digit code via SMS when logging in.
 */

import * as crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// In-memory store for verification codes (use Redis in production)
const verificationCodes = new Map<string, { code: string; expires: Date; attempts: number }>()

// Code configuration
const CODE_LENGTH = 6
const CODE_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 3

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString()
}

/**
 * Store a verification code for a user
 */
export function storeVerificationCode(userId: string, code: string): void {
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + CODE_EXPIRY_MINUTES)

    verificationCodes.set(userId, {
        code,
        expires,
        attempts: 0
    })
}

/**
 * Verify a code entered by the user
 */
export function verifyCode(userId: string, enteredCode: string): { valid: boolean; error?: string } {
    const stored = verificationCodes.get(userId)

    if (!stored) {
        return { valid: false, error: 'No verification code found. Please request a new one.' }
    }

    // Check expiry
    if (new Date() > stored.expires) {
        verificationCodes.delete(userId)
        return { valid: false, error: 'Code expired. Please request a new one.' }
    }

    // Check attempts
    if (stored.attempts >= MAX_ATTEMPTS) {
        verificationCodes.delete(userId)
        return { valid: false, error: 'Too many attempts. Please request a new code.' }
    }

    // Increment attempts
    stored.attempts++

    // Verify code
    if (stored.code === enteredCode) {
        verificationCodes.delete(userId)
        return { valid: true }
    }

    const remaining = MAX_ATTEMPTS - stored.attempts
    return {
        valid: false,
        error: remaining > 0
            ? `Invalid code. ${remaining} attempts remaining.`
            : 'Too many attempts. Please request a new code.'
    }
}

/**
 * Send verification code via SMS (direct Twilio, no credits needed for security)
 */
export async function sendVerificationSMS(
    phone: string,
    code: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER

        if (!accountSid || !authToken || !fromNumber) {
            return { success: false, error: 'SMS service not configured' }
        }

        // Format phone number
        const formattedPhone = formatPhoneForSMS(phone)
        if (!formattedPhone) {
            return { success: false, error: 'Invalid phone number' }
        }

        const message = `Your OroNext verification code is: ${code}\n\nThis code expires in ${CODE_EXPIRY_MINUTES} minutes.`

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: formattedPhone,
                    From: fromNumber,
                    Body: message
                })
            }
        )

        if (response.ok) {
            return { success: true }
        } else {
            const data = await response.json()
            console.error('[SMS MFA] Twilio error:', data)
            return { success: false, error: 'Failed to send SMS' }
        }
    } catch (error) {
        console.error('[SMS MFA] Error:', error)
        return { success: false, error: 'SMS service error' }
    }
}

/**
 * Format phone number for SMS delivery
 */
function formatPhoneForSMS(phone: string): string | null {
    const digits = phone.replace(/\D/g, '')

    if (digits.length === 10) {
        return `+1${digits}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`
    } else if (phone.startsWith('+')) {
        return phone
    }

    return null
}

/**
 * Request a verification code for a user
 */
export async function requestLoginCode(userId: string): Promise<{
    success: boolean
    maskedPhone?: string
    error?: string
}> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                phone: true
            }
        })

        if (!user) {
            return { success: false, error: 'User not found' }
        }

        if (!user.phone) {
            return { success: false, error: 'No phone number on file. Please add your phone number in settings.' }
        }

        const code = generateVerificationCode()
        storeVerificationCode(userId, code)

        const smsResult = await sendVerificationSMS(user.phone, code)

        if (!smsResult.success) {
            return { success: false, error: smsResult.error }
        }

        // Mask phone for display (show last 4 digits)
        const maskedPhone = user.phone.replace(/\d(?=\d{4})/g, '*')

        return {
            success: true,
            maskedPhone
        }
    } catch (error) {
        console.error('[SMS MFA] Request code error:', error)
        return { success: false, error: 'Failed to send code' }
    }
}

/**
 * Verify login code
 */
export function verifyLoginCode(userId: string, code: string): { valid: boolean; error?: string } {
    return verifyCode(userId, code)
}

// Export for security index
export const smsMfa = {
    generateVerificationCode,
    storeVerificationCode,
    verifyCode,
    sendVerificationSMS,
    requestLoginCode,
    verifyLoginCode
}

