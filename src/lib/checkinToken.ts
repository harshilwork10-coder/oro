/**
 * Multi-Tenant QR Check-In — Stateless HMAC Token Utility
 * 
 * Generates and verifies signed check-in tokens using HMAC-SHA256.
 * Tokens are stateless — no database lookup required for validation.
 * 
 * Token format: base64url(JSON payload) + "." + base64url(HMAC signature)
 * 
 * Payload:
 *   lid  - locationId
 *   did  - deviceId (station that generated the QR)
 *   bid  - brandId (franchisorId)
 *   iat  - issued at (unix seconds)
 *   exp  - expires at (unix seconds)
 * 
 * Security properties:
 * - Tokens cannot be forged without CHECKIN_TOKEN_SECRET (+ optional per-location salt)
 * - Tokens expire after TOKEN_TTL_SECONDS (default 24 hours)
 * - Location-bound: locationId in payload must match resolved location
 * - Device-bound: deviceId tracks which station generated the QR
 * - No PII — only IDs and timestamps
 * 
 * Backward compatibility:
 * - verifyCheckinToken() still accepts legacy slug-only tokens
 * - New callers should use generateQrToken() + verifyQrToken()
 */

import crypto from 'crypto'

// Dedicated secret for check-in tokens — isolated from station auth
const SECRET = process.env.CHECKIN_TOKEN_SECRET
  || 'CHECKIN_' + (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'default-dev-secret')

// 24 hours — long enough for a full business day, short enough to limit abuse
const TOKEN_TTL_SECONDS = 86400

// ════════════════════════════════════════════════════════════
// V2 — Multi-Tenant QR Tokens (recommended for all new code)
// ════════════════════════════════════════════════════════════

export interface QrTokenPayload {
  lid: string  // locationId
  did: string  // deviceId (stationId)
  bid: string  // brandId (franchisorId)
  iat: number  // issued at (unix seconds)
  exp: number  // expires at (unix seconds)
}

export interface QrTokenResult {
  token: string
  payload: QrTokenPayload
  tokenHash: string  // SHA-256 hash for audit DB storage
  expiresAt: Date
}

/**
 * Generate a multi-tenant HMAC QR token.
 * Pure computation — no DB calls, O(1).
 * 
 * @param locationId - The location this QR is for
 * @param deviceId   - The station/register generating the QR
 * @param brandId    - The franchisorId (brand context)
 * @param locationSalt - Optional per-location salt for rotation
 * @param ttlSeconds - Token TTL (default: 24h)
 */
export function generateQrToken(
  locationId: string,
  deviceId: string,
  brandId: string,
  locationSalt?: string | null,
  ttlSeconds = TOKEN_TTL_SECONDS
): QrTokenResult {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ttlSeconds

  const payload: QrTokenPayload = { lid: locationId, did: deviceId, bid: brandId, iat, exp }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sigKey = locationSalt ? `${SECRET}:${locationSalt}` : SECRET
  const sig = crypto.createHmac('sha256', sigKey).update(payloadStr).digest('base64url')

  const token = `${payloadStr}.${sig}`
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  return {
    token,
    payload,
    tokenHash,
    expiresAt: new Date(exp * 1000)
  }
}

/**
 * Verify a multi-tenant HMAC QR token.
 * Returns validated payload on success, null on failure.
 * Pure computation — no DB calls, O(1).
 * 
 * @param token - The raw token string from the QR URL
 * @param expectedLocationId - If provided, must match payload.lid
 * @param locationSalt - Per-location salt used during generation
 */
export function verifyQrToken(
  token: string,
  expectedLocationId?: string,
  locationSalt?: string | null
): QrTokenPayload | null {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null

    const payloadStr = token.substring(0, dotIndex)
    const sig = token.substring(dotIndex + 1)

    // Verify HMAC signature
    const sigKey = locationSalt ? `${SECRET}:${locationSalt}` : SECRET
    const expected = crypto.createHmac('sha256', sigKey).update(payloadStr).digest('base64url')

    if (sig.length !== expected.length) return null
    const sigBuf = Buffer.from(sig, 'utf-8')
    const expectedBuf = Buffer.from(expected, 'utf-8')
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    // Decode payload
    const payload: QrTokenPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'))

    // Verify expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null        // Expired
    if (payload.iat > now + 60) return null    // Future token (60s clock skew)

    // Verify location binding
    if (expectedLocationId && payload.lid !== expectedLocationId) return null

    return payload
  } catch {
    return null
  }
}

// ════════════════════════════════════════════════════════════
// V1 — Legacy Slug-Only Tokens (backward compatibility)
// Used by existing /checkin/[slug] page — DO NOT REMOVE
// ════════════════════════════════════════════════════════════

/**
 * Generate a stateless HMAC check-in token for a location slug.
 * @deprecated Use generateQrToken() for new code.
 */
export function generateCheckinToken(slug: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const payload = `${slug}.${ts}`
  const sig = crypto.createHmac('sha256', SECRET)
    .update(payload).digest('hex').substring(0, 16)
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

/**
 * Verify a legacy slug-only HMAC check-in token.
 * @deprecated Use verifyQrToken() for new code.
 */
export function verifyCheckinToken(token: string): { slug: string; issuedAt: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split('.')
    if (parts.length !== 3) return null

    const [slug, tsStr, sig] = parts
    if (!slug || !tsStr || !sig) return null

    const ts = parseInt(tsStr, 10)
    if (isNaN(ts)) return null

    const expected = crypto.createHmac('sha256', SECRET)
      .update(`${slug}.${tsStr}`).digest('hex').substring(0, 16)

    if (sig.length !== expected.length) return null
    const sigBuf = Buffer.from(sig, 'utf-8')
    const expectedBuf = Buffer.from(expected, 'utf-8')
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    const age = Math.floor(Date.now() / 1000) - ts
    if (age > TOKEN_TTL_SECONDS || age < -60) return null

    return { slug, issuedAt: ts }
  } catch {
    return null
  }
}

/**
 * Build the full check-in URL for a location slug.
 * V1: Uses legacy /checkin/[slug] route with slug-only token.
 * @deprecated Use buildBrandQrUrl() for new code.
 */
export function buildCheckinUrl(slug: string, origin: string): string {
  const token = generateCheckinToken(slug)
  return `${origin}/checkin/${encodeURIComponent(slug)}?t=${token}`
}

// ════════════════════════════════════════════════════════════
// V2 — Multi-Tenant URL Builder
// ════════════════════════════════════════════════════════════

/**
 * Build a brand-scoped QR check-in URL.
 * Tier 2: brandSubdomain.qr.oronext.app/slug?t=token&d=deviceId
 */
export function buildBrandQrUrl(opts: {
  brandCode: string
  slug: string
  token: string
  deviceId: string
  platformDomain?: string
}): string {
  // Use main domain with /qr/ path — subdomain DNS is not configured yet
  // Priority: explicit opt → env override → NEXTAUTH_URL (actual deployment) → production domain
  const domain = opts.platformDomain || process.env.QR_PLATFORM_DOMAIN || ''
  const baseUrl = domain
    ? (domain.startsWith('http') ? domain : `https://${domain}`)
    : (process.env.NEXTAUTH_URL || 'https://www.oronext.app')
  return `${baseUrl}/qr/${encodeURIComponent(opts.slug)}?t=${encodeURIComponent(opts.token)}&d=${encodeURIComponent(opts.deviceId)}`
}
