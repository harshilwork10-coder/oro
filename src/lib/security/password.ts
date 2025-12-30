/**
 * Password Security Utilities
 * Enforces password complexity and account lockout
 */

import { prisma } from '@/lib/prisma'

export interface PasswordValidationResult {
    valid: boolean
    errors: string[]
}

export interface PasswordRequirements {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumber: boolean
    requireSpecialChar: boolean
}

// Default password requirements
export const PASSWORD_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false // Optional for better UX, but recommended
}

/**
 * Validate password complexity
 */
export function validatePassword(
    password: string,
    requirements: PasswordRequirements = PASSWORD_REQUIREMENTS
): PasswordValidationResult {
    const errors: string[] = []

    if (!password) {
        return { valid: false, errors: ['Password is required'] }
    }

    if (password.length < requirements.minLength) {
        errors.push(`Password must be at least ${requirements.minLength} characters`)
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    }

    if (requirements.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number')
    }

    if (requirements.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character')
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'letmein']
    if (weakPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a stronger password')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Get human-readable password requirements
 */
export function getPasswordRequirementsText(
    requirements: PasswordRequirements = PASSWORD_REQUIREMENTS
): string[] {
    const reqs: string[] = []
    reqs.push(`At least ${requirements.minLength} characters`)
    if (requirements.requireUppercase) reqs.push('One uppercase letter (A-Z)')
    if (requirements.requireLowercase) reqs.push('One lowercase letter (a-z)')
    if (requirements.requireNumber) reqs.push('One number (0-9)')
    if (requirements.requireSpecialChar) reqs.push('One special character (!@#$%^&*)')
    return reqs
}

// Account lockout configuration
export const LOCKOUT_CONFIG = {
    maxAttempts: 5,           // Lock after 5 failed attempts
    lockoutDurationMinutes: 15 // 15 minute lockout
}

export interface LoginAttemptResult {
    allowed: boolean
    attemptsRemaining?: number
    lockedUntil?: Date
    message?: string
}

/**
 * Check if account is locked
 */
export async function checkAccountLockout(email: string): Promise<LoginAttemptResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                failedLoginAttempts: true,
                lockedUntil: true
            }
        })

        if (!user) {
            // Don't reveal if user exists
            return { allowed: true }
        }

        // Check if currently locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesRemaining = Math.ceil(
                (user.lockedUntil.getTime() - Date.now()) / 60000
            )
            return {
                allowed: false,
                lockedUntil: user.lockedUntil,
                message: `Account is temporarily locked. Try again in ${minutesRemaining} minute(s).`
            }
        }

        // If lockout has expired, reset it
        if (user.lockedUntil && user.lockedUntil <= new Date()) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            })
        }

        const attemptsRemaining = LOCKOUT_CONFIG.maxAttempts - (user.failedLoginAttempts || 0)

        return {
            allowed: true,
            attemptsRemaining
        }
    } catch (error) {
        console.error('Error checking account lockout:', error)
        return { allowed: true } // Fail open for availability
    }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(email: string): Promise<LoginAttemptResult> {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, failedLoginAttempts: true }
        })

        if (!user) {
            return { allowed: true }
        }

        const newAttempts = (user.failedLoginAttempts || 0) + 1
        const shouldLock = newAttempts >= LOCKOUT_CONFIG.maxAttempts
        const lockoutUntil = shouldLock
            ? new Date(Date.now() + LOCKOUT_CONFIG.lockoutDurationMinutes * 60000)
            : null

        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: newAttempts,
                lockedUntil: lockoutUntil
            }
        })

        if (shouldLock) {
            console.log(`[SECURITY] Account locked: ${email} after ${newAttempts} failed attempts`)
            return {
                allowed: false,
                lockedUntil: lockoutUntil!,
                message: `Too many failed attempts. Account locked for ${LOCKOUT_CONFIG.lockoutDurationMinutes} minutes.`
            }
        }

        return {
            allowed: true,
            attemptsRemaining: LOCKOUT_CONFIG.maxAttempts - newAttempts
        }
    } catch (error) {
        console.error('Error recording failed login:', error)
        return { allowed: true }
    }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLogins(email: string): Promise<void> {
    try {
        await prisma.user.update({
            where: { email: email.toLowerCase() },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        })
    } catch (error) {
        console.error('Error resetting failed logins:', error)
    }
}

