import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Enrich items using UPC database lookup
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can use enrichment
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { items } = await request.json()

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 })
        }

        // Enrich each item with UPC lookup
        const enrichedItems = []
        let lookupCount = 0
        const MAX_LOOKUPS = 50 // Limit per request to avoid rate limits

        for (const item of items) {
            if (!item.upc || lookupCount >= MAX_LOOKUPS) {
                // No UPC or hit limit - keep original
                enrichedItems.push({
                    ...item,
                    enrichedName: item.originalName,
                    brand: extractBrand(item.originalName),
                    size: extractSize(item.originalName),
                    needsEnrichment: false,
                    enrichmentSource: 'original'
                })
                continue
            }

            // Try UPC lookup
            const upcData = await lookupUPC(item.upc)
            lookupCount++

            if (upcData) {
                enrichedItems.push({
                    ...item,
                    enrichedName: upcData.title || item.originalName,
                    brand: upcData.brand || extractBrand(item.originalName),
                    size: upcData.size || extractSize(upcData.title || item.originalName),
                    category: upcData.category || item.department,
                    imageUrl: upcData.image,
                    needsEnrichment: false,
                    enrichmentSource: 'upc_database'
                })
            } else {
                // UPC not found - use original with extracted data
                enrichedItems.push({
                    ...item,
                    enrichedName: item.originalName,
                    brand: extractBrand(item.originalName),
                    size: extractSize(item.originalName),
                    needsEnrichment: false,
                    enrichmentSource: 'not_found'
                })
            }
        }

        return NextResponse.json({
            success: true,
            enrichedCount: enrichedItems.filter(i => i.enrichmentSource === 'upc_database').length,
            totalItems: enrichedItems.length,
            items: enrichedItems
        })

    } catch (error) {
        console.error('Error enriching items:', error)
        return NextResponse.json({ error: 'Failed to enrich items' }, { status: 500 })
    }
}

// Lookup UPC using UPCitemdb API (free tier: 100/day)
async function lookupUPC(upc: string): Promise<any | null> {
    try {
        // Clean UPC - remove any non-digits
        const cleanUpc = upc.replace(/\D/g, '')
        if (cleanUpc.length < 6) return null

        const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanUpc}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!res.ok) {
            // Debug log removed
            return null
        }

        const data = await res.json()

        if (data.items && data.items.length > 0) {
            const item = data.items[0]
            return {
                title: item.title,
                brand: item.brand,
                category: item.category,
                size: extractSizeFromTitle(item.title),
                image: item.images?.[0] || null
            }
        }

        return null
    } catch (error) {
        console.error('UPC lookup error:', error)
        return null
    }
}

// Extract size from product title (e.g., "12oz", "24pk", "750ml")
function extractSizeFromTitle(title: string): string | null {
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

// Extract size from original description
function extractSize(text: string): string | null {
    return extractSizeFromTitle(text)
}

// Extract brand from description (first word usually)
function extractBrand(text: string): string | null {
    if (!text) return null

    const words = text.trim().split(/\s+/)
    if (words.length > 0) {
        // Common brand patterns - first capitalized word
        const firstWord = words[0]
        if (firstWord.length >= 2 && /^[A-Z]/.test(firstWord)) {
            return firstWord
        }
    }
    return null
}

