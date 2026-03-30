import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
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
export async function POST(req: NextRequest) {
    try {
        // BUG FIX: was missing entirely — caused ReferenceError crash on every POST
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only providers/admins can bulk import to master DB
        if (!['PROVIDER', 'ADMIN', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { upcCodes, delayMs = 200 } = await req.json()

        if (!upcCodes || !Array.isArray(upcCodes)) {
            return NextResponse.json({ error: 'upcCodes array required' }, { status: 400 })
        }

        if (upcCodes.length > 500) {
            return NextResponse.json({
                error: 'Max 500 UPCs per batch',
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

            // Lookup from UPCitemdb with retry logic
            let retries = 0
            const maxRetries = 3
            let lookupSuccess = false

            while (retries < maxRetries && !lookupSuccess) {
                try {
                    const response = await fetch(`${UPC_API_URL}?upc=${upc}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'user_key': UPC_API_KEY
                        }
                    })

                    if (response.status === 429) {
                        retries++
                        if (retries < maxRetries) {
                            // Exponential backoff: 2s, 4s, 8s
                            const backoff = Math.pow(2, retries) * 1000
                            console.log(`[UPC API Rate Limited] Retry ${retries}/${maxRetries} in ${backoff}ms for UPC ${upc}`)
                            await new Promise(resolve => setTimeout(resolve, backoff))
                            continue
                        }
                        // All retries exhausted
                        console.error('[UPC API Rate Limited] All retries exhausted for UPC', upc)
                        results.push({ upc, status: 'error', error: 'Rate limited - retries exhausted' })
                        errorCount++
                        lookupSuccess = true // exit retry loop
                        continue
                    }

                    if (!response.ok) {
                        results.push({ upc, status: 'not_found' })
                        notFoundCount++
                        lookupSuccess = true
                        continue
                    }

                    const data = await response.json()

                    if (!data.items || data.items.length === 0) {
                        results.push({ upc, status: 'not_found' })
                        notFoundCount++
                        lookupSuccess = true
                        continue
                    }

                    const item = data.items[0]

                    // Save to master database
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
                    lookupSuccess = true

                    // Delay between API calls to avoid rate limiting
                    if (delayMs > 0) {
                        await new Promise(resolve => setTimeout(resolve, delayMs))
                    }

                } catch (err) {
                    retries++
                    if (retries >= maxRetries) {
                        results.push({ upc, status: 'error', error: 'API request failed after retries' })
                        errorCount++
                        lookupSuccess = true
                    }
                }
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
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        // BUG FIX: Provider users have franchiseId='__SYSTEM__', not a real franchise.
        // This is a provider-level route — check role, not franchiseId.
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only providers/admins/franchisors/owners can view master UPC stats
        if (!['PROVIDER', 'ADMIN', 'FRANCHISOR', 'OWNER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
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
