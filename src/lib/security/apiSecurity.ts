/**
 * API Security Module
 * 
 * Request signing for sensitive operations and OAuth 2.0 support
 * for third-party integrations.
 */

import * as crypto from 'crypto'

// ============================================================================
// REQUEST SIGNING
// ============================================================================

interface SignedRequest {
    timestamp: number
    signature: string
    payload: string
}

/**
 * Sign an API request payload
 * Used for sensitive operations to prevent tampering
 */
export function signRequest(
    payload: object,
    secretKey: string,
    expiryMs: number = 300000 // 5 minutes
): SignedRequest {
    const timestamp = Date.now()
    const payloadStr = JSON.stringify(payload)

    const dataToSign = `${timestamp}:${payloadStr}`
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(dataToSign)
        .digest('hex')

    return {
        timestamp,
        signature,
        payload: payloadStr
    }
}

/**
 * Verify a signed request
 */
export function verifySignedRequest(
    signedRequest: SignedRequest,
    secretKey: string,
    maxAgeMs: number = 300000 // 5 minutes
): { valid: boolean; error?: string; payload?: object } {
    const now = Date.now()

    // Check timestamp is not too old
    if (now - signedRequest.timestamp > maxAgeMs) {
        return { valid: false, error: 'REQUEST_EXPIRED' }
    }

    // Check timestamp is not in the future
    if (signedRequest.timestamp > now + 60000) { // 1 minute tolerance
        return { valid: false, error: 'INVALID_TIMESTAMP' }
    }

    // Verify signature
    const dataToSign = `${signedRequest.timestamp}:${signedRequest.payload}`
    const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(dataToSign)
        .digest('hex')

    if (!crypto.timingSafeEqual(
        Buffer.from(signedRequest.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    )) {
        return { valid: false, error: 'INVALID_SIGNATURE' }
    }

    try {
        const payload = JSON.parse(signedRequest.payload)
        return { valid: true, payload }
    } catch {
        return { valid: false, error: 'INVALID_PAYLOAD' }
    }
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export interface ApiKey {
    id: string
    key: string // Only shown once at creation
    keyHash: string // Stored version
    name: string
    scopes: string[]
    rateLimit: number // Requests per hour
    createdAt: Date
    expiresAt?: Date
    lastUsed?: Date
    isActive: boolean
}

/**
 * Generate a new API key
 */
export function generateApiKey(prefix: string = 'oro'): { key: string; hash: string } {
    const randomBytes = crypto.randomBytes(24).toString('hex')
    const key = `${prefix}_${randomBytes}`
    const hash = crypto.createHash('sha256').update(key).digest('hex')

    return { key, hash }
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
    // Format: prefix_48hexchars
    return /^[a-z]+_[a-f0-9]{48}$/.test(key)
}

// ============================================================================
// OAUTH 2.0 SUPPORT
// ============================================================================

export interface OAuthClient {
    clientId: string
    clientSecretHash: string
    name: string
    redirectUris: string[]
    scopes: string[]
    createdAt: Date
    isActive: boolean
}

export interface OAuthToken {
    accessToken: string
    refreshToken?: string
    tokenType: 'Bearer'
    expiresIn: number // seconds
    scope: string
    createdAt: Date
}

export interface OAuthAuthorizationCode {
    code: string
    clientId: string
    userId: string
    redirectUri: string
    scope: string
    expiresAt: Date
    used: boolean
}

// In-memory storage (use database in production)
const authorizationCodes = new Map<string, OAuthAuthorizationCode>()
const accessTokens = new Map<string, {
    userId: string
    clientId: string
    scope: string
    expiresAt: Date
}>()
const refreshTokens = new Map<string, {
    userId: string
    clientId: string
    scope: string
}>()

/**
 * Generate OAuth client credentials
 */
export function generateOAuthClientCredentials(): {
    clientId: string
    clientSecret: string
    clientSecretHash: string
} {
    const clientId = `client_${crypto.randomBytes(16).toString('hex')}`
    const clientSecret = crypto.randomBytes(32).toString('hex')
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex')

    return { clientId, clientSecret, clientSecretHash }
}

/**
 * Generate an authorization code
 */
export function generateAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scope: string,
    expirySeconds: number = 600 // 10 minutes
): string {
    const code = crypto.randomBytes(32).toString('hex')

    authorizationCodes.set(code, {
        code,
        clientId,
        userId,
        redirectUri,
        scope,
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
        used: false
    })

    return code
}

/**
 * Exchange authorization code for tokens
 */
export function exchangeAuthorizationCode(
    code: string,
    clientId: string,
    clientSecretHash: string,
    redirectUri: string,
    validateClient: (clientId: string, secretHash: string) => boolean
): { success: boolean; error?: string; tokens?: OAuthToken } {
    const authCode = authorizationCodes.get(code)

    if (!authCode) {
        return { success: false, error: 'invalid_grant' }
    }

    if (authCode.used) {
        // Code reuse attempt - security breach, invalidate all tokens
        return { success: false, error: 'invalid_grant' }
    }

    if (authCode.expiresAt < new Date()) {
        return { success: false, error: 'invalid_grant' }
    }

    if (authCode.clientId !== clientId) {
        return { success: false, error: 'invalid_client' }
    }

    if (authCode.redirectUri !== redirectUri) {
        return { success: false, error: 'invalid_request' }
    }

    // Validate client credentials
    if (!validateClient(clientId, clientSecretHash)) {
        return { success: false, error: 'invalid_client' }
    }

    // Mark code as used
    authCode.used = true

    // Generate tokens
    const accessToken = crypto.randomBytes(32).toString('hex')
    const refreshToken = crypto.randomBytes(32).toString('hex')
    const expiresIn = 3600 // 1 hour

    // Store access token
    accessTokens.set(accessToken, {
        userId: authCode.userId,
        clientId,
        scope: authCode.scope,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
    })

    // Store refresh token
    refreshTokens.set(refreshToken, {
        userId: authCode.userId,
        clientId,
        scope: authCode.scope
    })

    return {
        success: true,
        tokens: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn,
            scope: authCode.scope,
            createdAt: new Date()
        }
    }
}

/**
 * Validate an access token
 */
export function validateAccessToken(token: string): {
    valid: boolean
    userId?: string
    clientId?: string
    scope?: string
    error?: string
} {
    const tokenData = accessTokens.get(token)

    if (!tokenData) {
        return { valid: false, error: 'invalid_token' }
    }

    if (tokenData.expiresAt < new Date()) {
        accessTokens.delete(token)
        return { valid: false, error: 'token_expired' }
    }

    return {
        valid: true,
        userId: tokenData.userId,
        clientId: tokenData.clientId,
        scope: tokenData.scope
    }
}

/**
 * Refresh an access token
 */
export function refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecretHash: string,
    validateClient: (clientId: string, secretHash: string) => boolean
): { success: boolean; error?: string; tokens?: OAuthToken } {
    const tokenData = refreshTokens.get(refreshToken)

    if (!tokenData) {
        return { success: false, error: 'invalid_grant' }
    }

    if (tokenData.clientId !== clientId) {
        return { success: false, error: 'invalid_client' }
    }

    if (!validateClient(clientId, clientSecretHash)) {
        return { success: false, error: 'invalid_client' }
    }

    // Generate new access token
    const newAccessToken = crypto.randomBytes(32).toString('hex')
    const expiresIn = 3600

    accessTokens.set(newAccessToken, {
        userId: tokenData.userId,
        clientId,
        scope: tokenData.scope,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
    })

    return {
        success: true,
        tokens: {
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            expiresIn,
            scope: tokenData.scope,
            createdAt: new Date()
        }
    }
}

/**
 * Revoke a token
 */
export function revokeToken(token: string, tokenType: 'access' | 'refresh'): boolean {
    if (tokenType === 'access') {
        return accessTokens.delete(token)
    } else {
        return refreshTokens.delete(token)
    }
}

/**
 * Revoke all tokens for a user
 */
export function revokeUserTokens(userId: string): number {
    let count = 0

    for (const [token, data] of accessTokens) {
        if (data.userId === userId) {
            accessTokens.delete(token)
            count++
        }
    }

    for (const [token, data] of refreshTokens) {
        if (data.userId === userId) {
            refreshTokens.delete(token)
            count++
        }
    }

    return count
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

/**
 * Generate a webhook signature for outgoing webhooks
 */
export function generateWebhookSignature(
    payload: string,
    secret: string,
    timestamp: number = Date.now()
): string {
    const signedPayload = `${timestamp}.${payload}`
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

    return `t=${timestamp},v1=${signature}`
}

/**
 * Verify an incoming webhook signature
 */
export function verifyWebhookSignature(
    payload: string,
    signatureHeader: string,
    secret: string,
    toleranceSeconds: number = 300
): { valid: boolean; error?: string } {
    const parts = signatureHeader.split(',')
    const timestampPart = parts.find(p => p.startsWith('t='))
    const signaturePart = parts.find(p => p.startsWith('v1='))

    if (!timestampPart || !signaturePart) {
        return { valid: false, error: 'INVALID_SIGNATURE_FORMAT' }
    }

    const timestamp = parseInt(timestampPart.split('=')[1], 10)
    const signature = signaturePart.split('=')[1]

    // Check timestamp
    const now = Date.now()
    if (Math.abs(now - timestamp) > toleranceSeconds * 1000) {
        return { valid: false, error: 'TIMESTAMP_OUT_OF_RANGE' }
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

    try {
        if (!crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        )) {
            return { valid: false, error: 'SIGNATURE_MISMATCH' }
        }
    } catch {
        return { valid: false, error: 'INVALID_SIGNATURE' }
    }

    return { valid: true }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiSecurity = {
    // Request signing
    signRequest,
    verifySignedRequest,

    // API keys
    generateApiKey,
    hashApiKey,
    isValidApiKeyFormat,

    // OAuth 2.0
    generateOAuthClientCredentials,
    generateAuthorizationCode,
    exchangeAuthorizationCode,
    validateAccessToken,
    refreshAccessToken,
    revokeToken,
    revokeUserTokens,

    // Webhooks
    generateWebhookSignature,
    verifyWebhookSignature
}
