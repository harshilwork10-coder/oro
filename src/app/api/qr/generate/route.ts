/**
 * POST /api/qr/generate
 * 
 * Station-authenticated endpoint. Generates a signed QR check-in URL
 * for the station's location. Called by POS customer display on boot
 * and periodically for token rotation.
 * 
 * Auth: Station token (Bearer or X-Station-Token header)
 * 
 * Body (optional):
 *   { ttlSeconds?: number }  // Override default 24h TTL
 * 
 * Returns:
 *   {
 *     qrUrl:     string,    // Full branded QR URL to encode
 *     token:     string,    // Raw token (for debugging only)
 *     expiresAt: string,    // ISO timestamp
 *     refreshIn: number,    // Seconds until client should request new QR
 *     brand: { name, logo, colors }
 *   }
 */

import { NextResponse } from 'next/server'
import { validateStationFromRequest } from '@/lib/stationToken'
import { generateQrToken, buildBrandQrUrl } from '@/lib/checkinToken'
import { prisma } from '@/lib/prisma'
import { resolveBrand } from '@/lib/qr/brand-resolver'
import crypto from 'crypto'

// Default refresh interval: 1 hour (token is valid 24h, but rotate hourly)
const DEFAULT_REFRESH_SECONDS = 3600

export async function POST(request: Request) {
  try {
    // ─── Station Authentication ───
    let body: Record<string, unknown> = {}
    try { body = await request.json() } catch { /* empty body is fine */ }

    const station = await validateStationFromRequest(
      request.headers,
      body as { stationToken?: string; deviceId?: string }
    )

    if (!station) {
      return NextResponse.json(
        { error: 'Station authentication required. Device must be paired.' },
        { status: 401 }
      )
    }

    // ─── Resolve Location + Brand ───
    const location = await prisma.location.findUnique({
      where: { id: station.locationId },
      select: {
        id: true,
        slug: true,
        name: true,
        qrEnabled: true,
        qrTokenSalt: true,
        franchise: {
          select: {
            franchisorId: true,
            franchisor: {
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
            }
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found for this station.' },
        { status: 404 }
      )
    }

    // Check kill switches
    if (!location.qrEnabled) {
      return NextResponse.json(
        { error: 'QR check-in is disabled for this location.' },
        { status: 403 }
      )
    }

    const franchisor = location.franchise?.franchisor
    if (!franchisor?.qrEnabled) {
      return NextResponse.json(
        { error: 'QR check-in is disabled for this brand.' },
        { status: 403 }
      )
    }

    if (!franchisor.brandCode) {
      return NextResponse.json(
        { error: 'Brand is not configured for QR check-in (missing brandCode).' },
        { status: 422 }
      )
    }

    // ─── Generate Token ───
    const ttlSeconds = typeof body.ttlSeconds === 'number'
      ? Math.min(Math.max(body.ttlSeconds, 300), 86400) // Clamp: 5min to 24h
      : 86400

    const result = generateQrToken(
      location.id,
      station.stationId,
      franchisor.id,
      location.qrTokenSalt,
      ttlSeconds
    )

    // ─── Build URL ───
    const qrUrl = buildBrandQrUrl({
      brandCode: franchisor.brandCode.toLowerCase(),
      slug: location.slug,
      token: result.token,
      deviceId: station.stationId,
      platformDomain: new URL(request.url).origin,
    })

    // ─── Audit Trail (fire-and-forget) ───
    prisma.qrToken.create({
      data: {
        locationId: location.id,
        deviceId: station.stationId,
        tokenHash: result.tokenHash,
        expiresAt: result.expiresAt,
      }
    }).catch((err: Error) => {
      console.error('[QR/generate] Audit trail write failed:', err.message)
    })

    // ─── Response ───
    return NextResponse.json({
      qrUrl,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      refreshIn: Math.min(DEFAULT_REFRESH_SECONDS, ttlSeconds),
      location: {
        id: location.id,
        name: location.name,
        slug: location.slug,
      },
      brand: {
        id: franchisor.id,
        name: franchisor.name || franchisor.brandCode,
        brandCode: franchisor.brandCode,
        logoUrl: franchisor.logoUrl,
        primaryColor: franchisor.brandColorPrimary,
        secondaryColor: franchisor.brandColorSecondary,
        welcomeText: franchisor.qrWelcomeText,
        themeJson: franchisor.qrThemeJson,
      }
    })

  } catch (error) {
    console.error('[QR/generate] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
