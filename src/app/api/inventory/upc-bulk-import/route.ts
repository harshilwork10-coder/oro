import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// UPCitemdb API configuration
const UPC_API_KEY = process.env.UPCITEMDB_API_KEY || ''
const UPC_API_URL = 'https://api.upcitemdb.com/prod/v1/lookup'

interface ImportResult {
    upc: string
    status: 'success' | 'exists' | 'not_found' | 'error'
    name?: string
    error?: string
}

// POST: Bulk import UPC codes to master database
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        // Only providers/admins can bulk import to master DB
        if (!['PROVIDER', 'ADMIN', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { upcCodes, delayMs = 500 } = await request.json()

        if (!upcCodes || !Array.isArray(upcCodes)) {
            return NextResponse.json({ error: 'upcCodes array required' }, { status: 400 })
        }

        if (upcCodes.length > 100) {
            return NextResponse.json({
                error: 'Max 100 UPCs per batch',
                message: 'Split into multiple requests to avoid timeout'
            }, { status: 400 })
        }

        if (!UPC_API_KEY) {
            return NextResponse.json({
                error: 'UPC API not configured',
                message: 'Set UPCITEMDB_API_KEY in .env'
            }, { status: 503 })
        }

        const results: ImportResult[] = []
        let successCount = 0
        let existsCount = 0
        let notFoundCount = 0
        let errorCount = 0

        for (const rawUpc of upcCodes) {
            const upc = String(rawUpc).replace(/\D/g, '')

            if (upc.length < 8 || upc.length > 14) {
                results.push({ upc, status: 'error', error: 'Invalid UPC length' })
                errorCount++
                continue
            }

            // Check if already in master DB
            const existing = await prisma.masterUpcProduct.findUnique({
                where: { upc }
            })

            if (existing) {
                results.push({ upc, status: 'exists', name: existing.name })
                existsCount++
                continue
            }

            // Lookup from UPCitemdb
            try {
                const response = await fetch(`${UPC_API_URL}?upc=${upc}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'user_key': UPC_API_KEY
                    }
                })

                if (response.status === 429) {
                    const errorText = await response.text()
                    console.error('[UPC API Rate Limited]', response.status, errorText)
                    results.push({ upc, status: 'error', error: 'Rate limited - try again later' })
                    errorCount++
                    // Stop further requests if rate limited
                    break
                }

                if (!response.ok) {
                    results.push({ upc, status: 'not_found' })
                    notFoundCount++
                    continue
                }

                const data = await response.json()

                if (!data.items || data.items.length === 0) {
                    results.push({ upc, status: 'not_found' })
                    notFoundCount++
                    continue
                }

                const item = data.items[0]

                // Save to master database (only essential fields)
                await prisma.masterUpcProduct.create({
                    data: {
                        upc,
                        name: item.title || 'Unknown Product',
                        brand: item.brand || null,
                        description: item.description || null,
                        category: item.category || null,
                        size: item.size || null,
                        weight: item.weight || null
                    }
                })

                results.push({ upc, status: 'success', name: item.title })
                successCount++

                // Delay between API calls to avoid rate limiting
                if (delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                }

            } catch (err) {
                results.push({ upc, status: 'error', error: 'API request failed' })
                errorCount++
            }
        }

        return NextResponse.json({
            summary: {
                total: upcCodes.length,
                success: successCount,
                exists: existsCount,
                notFound: notFoundCount,
                errors: errorCount
            },
            results
        })

    } catch (error) {
        console.error('[UPC_BULK_IMPORT]', error)
        return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 })
    }
}

// GET: Get stats on master UPC database
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const totalProducts = await prisma.masterUpcProduct.count()

        const recentProducts = await prisma.masterUpcProduct.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                upc: true,
                name: true,
                brand: true,
                createdAt: true
            }
        })

        return NextResponse.json({
            totalProducts,
            recentProducts
        })

    } catch (error) {
        console.error('[UPC_BULK_GET]', error)
        return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
    }
}
