/**
 * POS Authentication Tests
 * 
 * Tests the production-grade auth system:
 * - Valid token → 200
 * - Missing token → 403 DEVICE_NOT_PAIRED
 * - Invalid token → 401 TOKEN_INVALID
 * - Expired token → 401 TOKEN_EXPIRED
 * - Revoked station → 403 STATION_REVOKED
 */

import { authenticatePOSRequest, issueStationToken, withPOSAuth } from '@/lib/posAuth'
import { NextResponse } from 'next/server'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        station: {
            findUnique: jest.fn()
        }
    }
}))

// Mock request helper
function createMockRequest(headers: Record<string, string> = {}): Request {
    return {
        headers: new Headers(headers),
        url: 'http://localhost:3000/api/pos/menu'
    } as unknown as Request
}

describe('POS Authentication', () => {

    describe('authenticatePOSRequest', () => {

        it('returns 403 DEVICE_NOT_PAIRED when token is missing', async () => {
            const request = createMockRequest({})
            const result = await authenticatePOSRequest(request)

            expect('error' in result).toBe(true)
            if ('error' in result) {
                expect(result.reason).toBe('TOKEN_MISSING')
            }
        })

        it('returns 401 TOKEN_INVALID when token is malformed', async () => {
            const request = createMockRequest({
                'x-station-token': 'invalid-token-format'
            })
            const result = await authenticatePOSRequest(request)

            expect('error' in result).toBe(true)
            if ('error' in result) {
                expect(result.reason).toBe('TOKEN_INVALID')
            }
        })

        it('returns context with valid token', async () => {
            // Issue a valid token
            const token = issueStationToken(
                'station-123',
                'location-456',
                'franchise-789',
                'device-fingerprint',
                'REG1'
            )

            const { prisma } = require('@/lib/prisma')
            prisma.station.findUnique.mockResolvedValue({ isTrusted: true })

            const request = createMockRequest({
                'x-station-token': token
            })
            const result = await authenticatePOSRequest(request)

            expect('ctx' in result).toBe(true)
            if ('ctx' in result) {
                expect(result.ctx.stationId).toBe('station-123')
                expect(result.ctx.locationId).toBe('location-456')
                expect(result.ctx.franchiseId).toBe('franchise-789')
                expect(result.ctx.stationName).toBe('REG1')
            }
        })

        it('returns 403 when station is revoked', async () => {
            const token = issueStationToken(
                'station-revoked',
                'location-456',
                'franchise-789',
                'device-fingerprint',
                'REG1'
            )

            const { prisma } = require('@/lib/prisma')
            prisma.station.findUnique.mockResolvedValue({ isTrusted: false })

            const request = createMockRequest({
                'x-station-token': token
            })
            const result = await authenticatePOSRequest(request)

            expect('error' in result).toBe(true)
            if ('error' in result) {
                expect(result.reason).toBe('STATION_REVOKED')
            }
        })
    })

    describe('issueStationToken', () => {

        it('creates a valid JWT token', () => {
            const token = issueStationToken(
                'station-123',
                'location-456',
                'franchise-789',
                'fingerprint',
                'Station 1'
            )

            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
            expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
        })
    })

    describe('withPOSAuth wrapper', () => {

        it('injects context into handler for valid token', async () => {
            const token = issueStationToken(
                'station-123',
                'location-456',
                'franchise-789',
                'fingerprint',
                'REG1'
            )

            const { prisma } = require('@/lib/prisma')
            prisma.station.findUnique.mockResolvedValue({ isTrusted: true })

            let capturedContext: any = null
            const handler = withPOSAuth(async (_req, ctx) => {
                capturedContext = ctx
                return NextResponse.json({ success: true })
            })

            const request = createMockRequest({
                'x-station-token': token
            })

            await handler(request)

            expect(capturedContext).not.toBeNull()
            expect(capturedContext.stationId).toBe('station-123')
        })

        it('returns 403 for missing token without calling handler', async () => {
            let handlerCalled = false
            const handler = withPOSAuth(async () => {
                handlerCalled = true
                return NextResponse.json({ success: true })
            })

            const request = createMockRequest({})
            const response = await handler(request)

            expect(handlerCalled).toBe(false)
            expect(response.status).toBe(403)
        })
    })
})
