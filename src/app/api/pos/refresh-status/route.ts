import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// SECURITY: JWT secret must match pin-login route
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_' + process.env.NEXTAUTH_SECRET?.slice(0, 16)

// Helper to verify mobile auth token from pin-login (JWT format)
function verifyMobileToken(authHeader: string | null): { userId: string; franchiseId: string; locationId: string | null } | null {
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        const token = authHeader.substring(7)
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; franchiseId: string; locationId: string | null; role: string }
        return { userId: payload.userId, franchiseId: payload.franchiseId, locationId: payload.locationId }
    } catch (error) {
        console.error('[REFRESH-STATUS] JWT verification failed:', error)
        return null
    }
}

/**
 * GET /api/pos/refresh-status
 * 
 * Lightweight endpoint for Android to quickly check if refresh is needed.
 * Returns counts and version hash - Android compares with local cache.
 */
export async function GET(req: NextRequest) {
    const mobileAuth = verifyMobileToken(req.headers.get('Authorization'))
    if (!mobileAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { franchiseId, locationId } = mobileAuth

    try {
        // Fast count queries
        const [serviceCount, productCount, discountCount, categoryCount, employeeCount] = await Promise.all([
            prisma.service.count({ where: { franchiseId } }),
            prisma.product.count({ where: { franchiseId, isActive: true } }),
            prisma.discount.count({ where: { franchiseId, isActive: true } }),
            prisma.serviceCategory.count({ where: { franchiseId } }),
            prisma.user.count({
                where: {
                    franchiseId,
                    role: { in: ['EMPLOYEE', 'MANAGER'] },
                    isActive: true
                }
            })
        ])

        // Get last update timestamps (newest service/product/employee)
        const [lastService, lastProduct] = await Promise.all([
            prisma.service.findFirst({
                where: { franchiseId },
                orderBy: { id: 'desc' },
                select: { id: true }
            }),
            prisma.product.findFirst({
                where: { franchiseId, isActive: true },
                orderBy: { id: 'desc' },
                select: { id: true }
            })
        ])

        // Generate version hash from counts + last IDs
        const versionData = JSON.stringify({
            s: serviceCount,
            p: productCount,
            d: discountCount,
            c: categoryCount,
            e: employeeCount,
            sl: lastService?.id,
            pl: lastProduct?.id
        })
        const versionHash = crypto.createHash('md5').update(versionData).digest('hex').substring(0, 8)

        return NextResponse.json({
            version: versionHash,
            counts: {
                services: serviceCount,
                products: productCount,
                discounts: discountCount,
                categories: categoryCount,
                employees: employeeCount
            },
            // Flags for Android to know what to refresh
            flags: {
                menuChanged: true, // Android compares versionHash with local
                employeesChanged: true // Android compares employeeCount
            },
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Version': versionHash
            }
        })

    } catch (error) {
        console.error('[REFRESH-STATUS] Error:', error)
        return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
    }
}
