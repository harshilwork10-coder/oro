/**
 * Salon QR Check-In — Stateless HMAC Token Utility
 * 
 * Generates and verifies signed check-in tokens using HMAC-SHA256.
 * Tokens are stateless — no database table needed.
 * 
 * Token format: base64url(slug.timestamp.signature)
 * - slug: location.slug (public, human-readable)
 * - timestamp: Unix epoch seconds when token was issued
 * - signature: HMAC-SHA256 truncated to 16 hex chars
 * 
 * Security properties:
 * - Tokens cannot be forged without CHECKIN_TOKEN_SECRET
 * - Tokens expire after TOKEN_TTL_SECONDS (24 hours)
 * - No internal IDs (cuid, locationId) in token
 * - Slug is the only public identifier
 */

import crypto from 'crypto'

// Dedicated secret for check-in tokens — isolated from station auth
const SECRET = process.env.CHECKIN_TOKEN_SECRET
  || 'CHECKIN_' + (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'default-dev-secret')

// 24 hours — long enough for a full business day, short enough to limit abuse
const TOKEN_TTL_SECONDS = 86400

/**
 * Generate a stateless HMAC check-in token for a location slug.
 * Pure computation — no DB calls, O(1).
 */
export function generateCheckinToken(slug: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const payload = `${slug}.${ts}`
  const sig = crypto.createHmac('sha256', SECRET)
    .update(payload).digest('hex').substring(0, 16)
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

/**
 * Verify a stateless HMAC check-in token.
 * Returns { slug, issuedAt } on success, null on failure or expiry.
 * Pure computation — no DB calls, O(1).
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

    // Verify HMAC signature
    const expected = crypto.createHmac('sha256', SECRET)
      .update(`${slug}.${tsStr}`).digest('hex').substring(0, 16)
    
    // Timing-safe comparison to prevent timing attacks
    if (sig.length !== expected.length) return null
    const sigBuf = Buffer.from(sig, 'utf-8')
    const expectedBuf = Buffer.from(expected, 'utf-8')
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    // Verify TTL — reject expired or future tokens
    const age = Math.floor(Date.now() / 1000) - ts
    if (age > TOKEN_TTL_SECONDS || age < -60) return null // Allow 60s clock skew

    return { slug, issuedAt: ts }
  } catch {
    return null
  }
}

/**
 * Build the full check-in URL for a location slug.
 * Used by display-sync to include QR URL in IDLE response.
 */
export function buildCheckinUrl(slug: string, origin: string): string {
  const token = generateCheckinToken(slug)
  return `${origin}/checkin/${encodeURIComponent(slug)}?t=${token}`
}
