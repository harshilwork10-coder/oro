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

// Encryption utilities (PCI DSS / sensitive data)
export {
    encryptField,
    decryptField,
    encryptCardNumber,
    maskCardNumber,
    hashForSearch,
    generateSecureToken,
    generateEncryptionKey,
    type EncryptedField
} from './encryption'

// Multi-Factor Authentication (MFA)
export {
    generateMFASetup,
    verifyMFAToken,
    verifyMFAWithBackup,
    removeUsedBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    isMFARequiredForRole,
    isMFARecommendedForRole,
    type MFASetupResult,
    type MFAVerifyResult
} from './mfa'

// Session Security (Zero Trust)
export {
    sessionSecurity,
    generateDeviceFingerprint,
    validateDeviceFingerprint,
    createBoundSession,
    validateBoundSession,
    invalidateSession,
    invalidateAllUserSessions,
    recordUserActivity,
    detectAnomalies,
    shouldBlockSession,
    calculateRiskScore,
    type DeviceFingerprint,
    type SessionContext,
    type BoundSession,
    type AnomalyEvent
} from './session'

// API Security (Request Signing, OAuth, Webhooks)
export {
    apiSecurity,
    signRequest,
    verifySignedRequest,
    generateApiKey,
    hashApiKey,
    isValidApiKeyFormat,
    generateOAuthClientCredentials,
    generateAuthorizationCode,
    exchangeAuthorizationCode,
    validateAccessToken,
    refreshAccessToken,
    revokeToken,
    revokeUserTokens,
    generateWebhookSignature,
    verifyWebhookSignature,
    type ApiKey,
    type OAuthClient,
    type OAuthToken,
    type OAuthAuthorizationCode
} from './apiSecurity'

// GDPR Compliance
export {
    gdprCompliance,
    exportUserData,
    deleteUserData,
    recordConsent,
    hasConsent,
    getUserConsents,
    revokeConsent,
    revokeAllConsents,
    getRetentionPolicy,
    getAllRetentionPolicies,
    shouldPurgeData,
    getPrivacyDashboard,
    type ConsentType,
    type ConsentRecord,
    type RetentionPolicy,
    type PrivacyDashboard
} from './gdpr'

// SMS-Based MFA
export {
    smsMfa,
    generateVerificationCode,
    storeVerificationCode,
    verifyCode,
    sendVerificationSMS,
    requestLoginCode,
    verifyLoginCode
} from './smsMfa'




