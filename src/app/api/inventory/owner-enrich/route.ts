import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Enrich items using UPC database lookup AND add to master DB
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Allow OWNER, MANAGER, PROVIDER
        if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { items } = await request.json()

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Items array required' }, { status: 400 })
        }

        // Enrich each item with UPC lookup
        const enrichedItems = []
        let lookupCount = 0
        let addedToMasterDb = 0
        const MAX_LOOKUPS = 100 // Limit per request

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

            const cleanUpc = item.upc.replace(/\D/g, '')

            // First check our master database
            const masterProduct = await prisma.masterUpcProduct.findUnique({
                where: { upc: cleanUpc }
            })

            if (masterProduct) {
                // Found in master DB - use it
                enrichedItems.push({
                    ...item,
                    enrichedName: masterProduct.name || item.originalName,
                    brand: masterProduct.brand || extractBrand(item.originalName),
                    size: masterProduct.size || extractSize(masterProduct.name || item.originalName),
                    category: masterProduct.category || item.department,
                    needsEnrichment: false,
                    enrichmentSource: 'upc_database'
                })
                continue
            }

            // Not in master DB - try external API lookup
            const upcData = await lookupUPC(cleanUpc)
            lookupCount++

            if (upcData) {
                // Found in external API - save to master DB for future use
                try {
                    await prisma.masterUpcProduct.create({
                        data: {
                            upc: cleanUpc,
                            name: upcData.title || 'Unknown Product',
                            brand: upcData.brand || null,
                            description: upcData.description || null,
                            category: upcData.category || null,
                            size: upcData.size || null
                        }
                    })
                    addedToMasterDb++
                } catch (e) {
                    // Might already exist from concurrent request
                }

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
                // UPC not found anywhere - use original with extracted data
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
            addedToMasterDb,
            totalItems: enrichedItems.length,
            items: enrichedItems
        })

    } catch (error) {
        console.error('Error enriching items:', error)
        return NextResponse.json({ error: 'Failed to enrich items' }, { status: 500 })
    }
}

// Lookup UPC using UPCitemdb API (free trial tier)
async function lookupUPC(upc: string): Promise<any | null> {
    try {
        if (upc.length < 6) return null

        const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        })

        if (!res.ok) return null

        const data = await res.json()

        if (data.items && data.items.length > 0) {
            const item = data.items[0]
            return {
                title: item.title,
                brand: item.brand,
                category: item.category,
                description: item.description,
                size: extractSizeFromTitle(item.title),
                image: item.images?.[0] || null
            }
        }

        return null
    } catch (error) {
        return null
    }
}

// Extract size from product title
function extractSizeFromTitle(title: string): string | null {
    if (!title) return null

    const patterns = [
        /(\d+\.?\d*\s*oz)/i,
        /(\d+\.?\d*\s*ml)/i,
        /(\d+\.?\d*\s*l)\b/i,
        /(\d+\.?\d*\s*pk)/i,
        /(\d+\.?\d*\s*pack)/i,
        /(\d+\.?\d*\s*ct)/i,
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

function extractSize(text: string): string | null {
    return extractSizeFromTitle(text)
}

function extractBrand(text: string): string | null {
    if (!text) return null
    const words = text.trim().split(/\s+/)
    if (words.length > 0 && words[0].length >= 2 && /^[A-Z]/.test(words[0])) {
        return words[0]
    }
    return null
}
