/**
 * QR Brand Resolver — Multi-Tenant Brand Resolution with Redis Caching
 * 
 * Resolves brandCode (from subdomain or custom domain) → Franchisor record.
 * Uses the existing cache.ts infrastructure (Upstash Redis) with 60s TTL.
 * 
 * Resolution priority:
 *   1. qrSubdomain (explicit override)
 *   2. brandCode (from Franchisor.brandCode)
 *   3. domain (custom domain lookup)
 * 
 * Cache key format: brand:{brandCode}
 */

import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/cache'

const BRAND_CACHE_TTL = 60 // 60 seconds — fast rotation, low staleness

export interface ResolvedBrand {
  franchisorId: string
  brandCode: string
  brandName: string
  logoUrl: string | null
  brandColorPrimary: string | null
  brandColorSecondary: string | null
  qrEnabled: boolean
  qrWelcomeText: string | null
  qrThemeJson: string | null
}

/**
 * Resolve a brandCode (from subdomain) to a full brand profile.
 * Caches result for 60 seconds in Redis.
 * 
 * @param brandCode - The subdomain or brandCode identifier (e.g., "shubh-beauty")
 * @returns ResolvedBrand or null if not found/disabled
 */
export async function resolveBrand(brandCode: string): Promise<ResolvedBrand | null> {
  if (!brandCode) return null

  const cacheKey = `brand:${brandCode.toLowerCase()}`

  // Try cache first
  const cached = await cacheGet<ResolvedBrand>(cacheKey)
  if (cached) return cached

  // Cache miss — query database
  const franchisor = await prisma.franchisor.findFirst({
    where: {
      OR: [
        { qrSubdomain: brandCode.toLowerCase() },
        { brandCode: brandCode.toLowerCase() },
        { brandCode: brandCode.toUpperCase() },  // Legacy: some brandCodes are UPPERCASE
      ],
      qrEnabled: true,
    },
    select: {
      id: true,
      brandCode: true,
      name: true,
      logoUrl: true,
      brandColorPrimary: true,
      brandColorSecondary: true,
      qrEnabled: true,
      qrWelcomeText: true,
      qrThemeJson: true,
    }
  })

  if (!franchisor || !franchisor.brandCode) return null

  const resolved: ResolvedBrand = {
    franchisorId: franchisor.id,
    brandCode: franchisor.brandCode,
    brandName: franchisor.name || franchisor.brandCode,
    logoUrl: franchisor.logoUrl,
    brandColorPrimary: franchisor.brandColorPrimary,
    brandColorSecondary: franchisor.brandColorSecondary,
    qrEnabled: franchisor.qrEnabled,
    qrWelcomeText: franchisor.qrWelcomeText,
    qrThemeJson: franchisor.qrThemeJson,
  }

  // Cache the result (fire-and-forget)
  cacheSet(cacheKey, resolved, BRAND_CACHE_TTL).catch(() => {})

  return resolved
}

/**
 * Resolve a custom domain to a brand.
 * Used for Tier 1 custom domain routing.
 * 
 * @param domain - Custom domain (e.g., "checkin.shubhbeauty.com")
 */
export async function resolveBrandByDomain(domain: string): Promise<ResolvedBrand | null> {
  if (!domain) return null

  const cacheKey = `brand-domain:${domain.toLowerCase()}`

  const cached = await cacheGet<ResolvedBrand>(cacheKey)
  if (cached) return cached

  const franchisor = await prisma.franchisor.findFirst({
    where: {
      domain: domain.toLowerCase(),
      qrEnabled: true,
    },
    select: {
      id: true,
      brandCode: true,
      name: true,
      logoUrl: true,
      brandColorPrimary: true,
      brandColorSecondary: true,
      qrEnabled: true,
      qrWelcomeText: true,
      qrThemeJson: true,
    }
  })

  if (!franchisor || !franchisor.brandCode) return null

  const resolved: ResolvedBrand = {
    franchisorId: franchisor.id,
    brandCode: franchisor.brandCode,
    brandName: franchisor.name || franchisor.brandCode,
    logoUrl: franchisor.logoUrl,
    brandColorPrimary: franchisor.brandColorPrimary,
    brandColorSecondary: franchisor.brandColorSecondary,
    qrEnabled: franchisor.qrEnabled,
    qrWelcomeText: franchisor.qrWelcomeText,
    qrThemeJson: franchisor.qrThemeJson,
  }

  cacheSet(cacheKey, resolved, BRAND_CACHE_TTL).catch(() => {})
  return resolved
}

/**
 * Resolve a location slug within a brand scope.
 * Returns the location only if it belongs to the specified franchisor.
 * 
 * @param slug         - Location slug (e.g., "downtown-chicago")
 * @param franchisorId - Franchisor ID to scope the lookup
 */
export async function resolveLocationForBrand(slug: string, franchisorId: string) {
  const location = await prisma.location.findFirst({
    where: {
      slug,
      qrEnabled: true,
      franchise: { franchisorId },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      franchiseId: true,
      franchisorId: true,
      qrTokenSalt: true,
      businessType: true,
    }
  })

  return location
}

/**
 * Extract brandCode from a hostname.
 * Supports: {brandCode}.qr.oronext.app pattern
 * 
 * @param hostname - Full hostname from request
 * @param platformQrDomain - The platform QR domain (default: qr.oronext.app)
 * @returns brandCode or null if not a brand subdomain
 */
export function extractBrandFromHost(
  hostname: string,
  platformQrDomain = process.env.QR_PLATFORM_DOMAIN || 'qr.oronext.app'
): string | null {
  const normalized = hostname.toLowerCase()

  // Pattern: {brandCode}.qr.oronext.app
  if (normalized.endsWith(`.${platformQrDomain}`)) {
    const brandCode = normalized.replace(`.${platformQrDomain}`, '')
    if (brandCode && !brandCode.includes('.')) {
      return brandCode
    }
  }

  return null
}
