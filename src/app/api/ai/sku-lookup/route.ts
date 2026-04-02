import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/ai/sku-lookup?barcode=1851820244
 * Looks up a barcode via UPCitemdb and returns product info.
 * Returns the shape: { found, name, brand, size, category, suggestedPrice }
 * which the retail inventory page expects.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const barcode = req.nextUrl.searchParams.get('barcode')
        if (!barcode || barcode.length < 6) {
            return NextResponse.json({ found: false, name: null, brand: null, size: null, category: null })
        }

        // Clean UPC — remove any non-digits
        const cleanUpc = barcode.replace(/\D/g, '')

        // Call UPCitemdb free API
        const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanUpc}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        })

        if (!upcRes.ok) {
            console.warn('[SKU_LOOKUP] UPCitemdb returned', upcRes.status, 'for', cleanUpc)
            return NextResponse.json({ found: false, name: null, brand: null, size: null, category: null })
        }

        const data = await upcRes.json()

        if (data.items && data.items.length > 0) {
            const item = data.items[0]
            const title = item.title || ''
            const brand = item.brand || extractBrand(title)
            const size = extractSize(title)
            const category = item.category || null

            // Build a suggested retail price from lowest_recorded_price or offers
            let suggestedPrice: number | null = null
            if (item.highest_recorded_price) {
                suggestedPrice = item.highest_recorded_price
            } else if (item.offers && item.offers.length > 0) {
                const prices = item.offers
                    .map((o: any) => o.price ? parseFloat(o.price) : 0)
                    .filter((p: number) => p > 0)
                if (prices.length > 0) {
                    suggestedPrice = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length * 100) / 100
                }
            }

            return NextResponse.json({
                found: true,
                name: title,
                brand,
                size,
                category,
                suggestedPrice,
                imageUrl: item.images?.[0] || null
            })
        }

        // Not found in UPC database
        return NextResponse.json({ found: false, name: null, brand: null, size: null, category: null })

    } catch (error) {
        console.error('[SKU_LOOKUP]', error)
        return NextResponse.json({ found: false, name: null, brand: null, size: null, category: null })
    }
}

// Keep POST for backwards compatibility
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { barcode } = await req.json()
        if (barcode) {
            // Redirect to GET logic
            const url = new URL(req.url)
            url.searchParams.set('barcode', barcode)
            const getReq = new NextRequest(url, { method: 'GET', headers: req.headers })
            return GET(getReq)
        }

        return NextResponse.json({ found: false, results: [], message: 'Provide a barcode parameter' })
    } catch (error) {
        console.error('[SKU_LOOKUP_POST]', error)
        return NextResponse.json({ error: 'Failed to perform SKU lookup' }, { status: 500 })
    }
}

// ── Helpers ──

function extractSize(title: string): string | null {
    if (!title) return null
    const patterns = [
        /(\d+\.?\d*\s*oz)/i,
        /(\d+\.?\d*\s*ml)/i,
        /(\d+\.?\d*\s*l)\b/i,
        /(\d+\.?\d*\s*pk)/i,
        /(\d+\.?\d*\s*pack)/i,
        /(\d+\.?\d*\s*ct)/i,
        /(\d+\.?\d*\s*count)/i,
        /(\d+\.?\d*\s*lb)/i,
        /(\d+\.?\d*\s*g)\b/i,
        /(\d+\.?\d*\s*kg)/i
    ]
    for (const pattern of patterns) {
        const match = title.match(pattern)
        if (match) return match[1].trim()
    }
    return null
}

function extractBrand(title: string): string | null {
    if (!title) return null
    const words = title.trim().split(/\s+/)
    if (words.length > 0 && words[0].length >= 2 && /^[A-Z]/.test(words[0])) {
        return words[0]
    }
    return null
}
