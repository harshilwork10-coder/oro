/**
 * Input Validation Utilities
 * Provides secure validation for common input types
 */

// CUID format validation (cuid() generates 25-character strings starting with 'c')
const CUID_REGEX = /^c[a-z0-9]{24}$/

// Email validation (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ValidationResult {
    valid: boolean
    error?: string
    sanitized?: string
}

/**
 * Validate a CUID (Collision-resistant Unique Identifier)
 */
export function validateCuid(id: string | undefined | null): ValidationResult {
    if (!id) {
        return { valid: false, error: 'ID is required' }
    }

    if (typeof id !== 'string') {
        return { valid: false, error: 'ID must be a string' }
    }

    const trimmed = id.trim()

    if (!CUID_REGEX.test(trimmed)) {
        return { valid: false, error: 'Invalid ID format' }
    }

    return { valid: true, sanitized: trimmed }
}

/**
 * Validate an email address
 */
export function validateEmail(email: string | undefined | null): ValidationResult {
    if (!email) {
        return { valid: false, error: 'Email is required' }
    }

    if (typeof email !== 'string') {
        return { valid: false, error: 'Email must be a string' }
    }

    const trimmed = email.trim().toLowerCase()

    if (trimmed.length > 254) {
        return { valid: false, error: 'Email is too long' }
    }

    if (!EMAIL_REGEX.test(trimmed)) {
        return { valid: false, error: 'Invalid email format' }
    }

    return { valid: true, sanitized: trimmed }
}

/**
 * Validate a UUID v4
 */
export function validateUuid(uuid: string | undefined | null): ValidationResult {
    if (!uuid) {
        return { valid: false, error: 'UUID is required' }
    }

    if (typeof uuid !== 'string') {
        return { valid: false, error: 'UUID must be a string' }
    }

    const trimmed = uuid.trim().toLowerCase()

    if (!UUID_REGEX.test(trimmed)) {
        return { valid: false, error: 'Invalid UUID format' }
    }

    return { valid: true, sanitized: trimmed }
}

/**
 * Sanitize a string for safe storage/display
 * Removes potential XSS vectors and trims whitespace
 */
export function sanitizeString(
    input: string | undefined | null,
    options: {
        maxLength?: number
        allowHtml?: boolean
        required?: boolean
    } = {}
): ValidationResult {
    const { maxLength = 10000, allowHtml = false, required = false } = options

    if (!input) {
        if (required) {
            return { valid: false, error: 'This field is required' }
        }
        return { valid: true, sanitized: '' }
    }

    if (typeof input !== 'string') {
        return { valid: false, error: 'Input must be a string' }
    }

    let sanitized = input.trim()

    // Remove null bytes (common attack vector)
    sanitized = sanitized.replace(/\0/g, '')

    // Limit length
    if (sanitized.length > maxLength) {
        return { valid: false, error: `Input exceeds maximum length of ${maxLength} characters` }
    }

    // Strip HTML if not allowed
    if (!allowHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '')
    }

    return { valid: true, sanitized }
}

/**
 * Validate a positive integer
 */
export function validatePositiveInt(
    value: number | string | undefined | null,
    options: { max?: number; required?: boolean } = {}
): ValidationResult {
    const { max = Number.MAX_SAFE_INTEGER, required = false } = options

    if (value === undefined || value === null || value === '') {
        if (required) {
            return { valid: false, error: 'This field is required' }
        }
        return { valid: true }
    }

    const num = typeof value === 'string' ? parseInt(value, 10) : value

    if (isNaN(num) || !Number.isInteger(num)) {
        return { valid: false, error: 'Must be a valid integer' }
    }

    if (num < 0) {
        return { valid: false, error: 'Must be a positive number' }
    }

    if (num > max) {
        return { valid: false, error: `Must not exceed ${max}` }
    }

    return { valid: true, sanitized: String(num) }
}

/**
 * Validate a decimal/money value
 */
export function validateDecimal(
    value: number | string | undefined | null,
    options: { max?: number; min?: number; required?: boolean } = {}
): ValidationResult {
    const { max = 999999999.99, min = 0, required = false } = options

    if (value === undefined || value === null || value === '') {
        if (required) {
            return { valid: false, error: 'This field is required' }
        }
        return { valid: true }
    }

    const num = typeof value === 'string' ? parseFloat(value) : value

    if (isNaN(num)) {
        return { valid: false, error: 'Must be a valid number' }
    }

    if (num < min) {
        return { valid: false, error: `Must be at least ${min}` }
    }

    if (num > max) {
        return { valid: false, error: `Must not exceed ${max}` }
    }

    return { valid: true, sanitized: num.toFixed(2) }
}

/**
 * Validate request body against a schema
 */
export function validateRequestBody<T extends Record<string, unknown>>(
    body: unknown,
    schema: {
        [K in keyof T]: {
            type: 'string' | 'number' | 'boolean' | 'email' | 'cuid'
            required?: boolean
            maxLength?: number
        }
    }
): { valid: boolean; errors: Record<string, string>; data: Partial<T> } {
    const errors: Record<string, string> = {}
    const data: Partial<T> = {}

    if (!body || typeof body !== 'object') {
        return { valid: false, errors: { _body: 'Invalid request body' }, data }
    }

    const bodyObj = body as Record<string, unknown>

    for (const [key, rules] of Object.entries(schema)) {
        const value = bodyObj[key]

        switch (rules.type) {
            case 'email': {
                const result = validateEmail(value as string)
                if (!result.valid && (rules.required || value)) {
                    errors[key] = result.error!
                } else if (result.sanitized) {
                    (data as Record<string, unknown>)[key] = result.sanitized
                }
                break
            }
            case 'cuid': {
                const result = validateCuid(value as string)
                if (!result.valid && (rules.required || value)) {
                    errors[key] = result.error!
                } else if (result.sanitized) {
                    (data as Record<string, unknown>)[key] = result.sanitized
                }
                break
            }
            case 'string': {
                const result = sanitizeString(value as string, {
                    required: rules.required,
                    maxLength: rules.maxLength
                })
                if (!result.valid) {
                    errors[key] = result.error!
                } else {
                    (data as Record<string, unknown>)[key] = result.sanitized
                }
                break
            }
            case 'number': {
                const result = validateDecimal(value as number, { required: rules.required })
                if (!result.valid) {
                    errors[key] = result.error!
                } else if (result.sanitized) {
                    (data as Record<string, unknown>)[key] = parseFloat(result.sanitized)
                }
                break
            }
            case 'boolean': {
                if (rules.required && value === undefined) {
                    errors[key] = 'This field is required'
                } else if (value !== undefined) {
                    (data as Record<string, unknown>)[key] = Boolean(value)
                }
                break
            }
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data
    }
}

