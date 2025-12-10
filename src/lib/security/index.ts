/**
 * Security Module Index
 * Re-exports all security utilities for convenient importing
 */

// Validation utilities
export {
    validateCuid,
    validateEmail,
    validateUuid,
    sanitizeString,
    validatePositiveInt,
    validateDecimal,
    validateRequestBody,
    type ValidationResult
} from './validation'

// Audit logging
export {
    logAudit,
    logSuccess,
    logFailure,
    logBlocked,
    createAuditLogger,
    type AuditAction,
    type AuditStatus,
    type AuditLogParams
} from './audit'

// Rate limiting
export {
    checkRateLimit,
    applyRateLimit,
    getRateLimitHeaders,
    cleanupRateLimitRecords,
    RATE_LIMITS,
    type RateLimitConfig,
    type RateLimitResult
} from './rateLimit'

// Security headers
export {
    SECURITY_HEADERS,
    addSecurityHeaders,
    getSecureHeaders,
    securityHeadersConfig
} from './headers'

// Password security
export {
    validatePassword,
    getPasswordRequirementsText,
    checkAccountLockout,
    recordFailedLogin,
    resetFailedLogins,
    PASSWORD_REQUIREMENTS,
    LOCKOUT_CONFIG,
    type PasswordValidationResult,
    type PasswordRequirements,
    type LoginAttemptResult
} from './password'
