import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Industry-standard department mapping
const STANDARD_DEPARTMENTS: { [key: string]: { keywords: string[], category: string } } = {
    'Beverages': {
        keywords: ['cola', 'pepsi', 'coke', 'sprite', 'fanta', 'dr pepper', '7up', 'mountain dew', 'soda', 'pop', 'soft drink', 'energy drink', 'red bull', 'monster', 'gatorade', 'powerade', 'water', 'juice', 'tea', 'coffee', 'lemonade', 'drink'],
        category: 'Beverages'
    },
    'Beer': {
        keywords: ['beer', 'lager', 'ale', 'ipa', 'stout', 'pilsner', 'budweiser', 'bud light', 'miller', 'coors', 'corona', 'heineken', 'modelo', 'michelob', 'busch', 'natural light', 'keystone', 'pabst', 'stella'],
        category: 'Beer'
    },
    'Wine': {
        keywords: ['wine', 'cabernet', 'merlot', 'chardonnay', 'pinot', 'sauvignon', 'riesling', 'moscato', 'champagne', 'prosecco', 'rose', 'zinfandel', 'shiraz', 'malbec'],
        category: 'Wine'
    },
    'Spirits': {
        keywords: ['vodka', 'whiskey', 'whisky', 'bourbon', 'rum', 'gin', 'tequila', 'brandy', 'cognac', 'scotch', 'liquor', 'liqueur', 'hennessy', 'jack daniels', 'crown royal', 'patron', 'grey goose', 'absolut', 'smirnoff', 'bacardi', 'captain morgan', 'jameson', 'johnnie walker'],
        category: 'Spirits'
    },
    'Tobacco': {
        keywords: ['cigarette', 'cigar', 'tobacco', 'marlboro', 'camel', 'newport', 'american spirit', 'parliament', 'pall mall', 'winston', 'kool', 'salem', 'virginia slims', 'swisher', 'black mild', 'backwoods', 'dutch', 'white owl', 'game', 'vape', 'juul', 'elf bar', 'disposable'],
        category: 'Tobacco'
    },
    'Snacks': {
        keywords: ['chip', 'chips', 'doritos', 'lays', 'cheetos', 'pringles', 'fritos', 'ruffles', 'tostitos', 'popcorn', 'pretzel', 'cracker', 'cookie', 'oreo', 'candy', 'chocolate', 'snack', 'nut', 'peanut', 'almond', 'cashew', 'beef jerky', 'slim jim', 'granola', 'trail mix'],
        category: 'Snacks'
    },
    'Candy': {
        keywords: ['candy', 'gum', 'mint', 'skittles', 'starburst', 'snickers', 'twix', 'kit kat', 'reeses', 'hershey', 'm&m', 'milky way', '3 musketeers', 'butterfinger', 'sour patch', 'gummy', 'lollipop', 'mentos', 'tic tac', 'orbit', 'trident', 'extra'],
        category: 'Candy'
    },
    'Dairy': {
        keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ice cream', 'egg', 'eggs'],
        category: 'Dairy'
    },
    'Grocery': {
        keywords: ['bread', 'cereal', 'soup', 'pasta', 'rice', 'beans', 'canned', 'sauce', 'flour', 'sugar', 'oil', 'condiment', 'ketchup', 'mustard', 'mayo', 'salad', 'dressing'],
        category: 'Grocery'
    },
    'Frozen': {
        keywords: ['frozen', 'ice', 'pizza', 'hot pocket', 'ice cream', 'popsicle'],
        category: 'Frozen'
    },
    'Health & Beauty': {
        keywords: ['shampoo', 'soap', 'toothpaste', 'deodorant', 'lotion', 'medicine', 'pain', 'vitamin', 'bandage', 'first aid', 'aspirin', 'tylenol', 'advil', 'ibuprofen'],
        category: 'Health & Beauty'
    },
    'Household': {
        keywords: ['paper towel', 'toilet paper', 'tissue', 'cleaning', 'detergent', 'bleach', 'trash bag', 'garbage bag', 'battery', 'batteries', 'light bulb', 'charger'],
        category: 'Household'
    },
    'Lottery': {
        keywords: ['lottery', 'lotto', 'scratch', 'powerball', 'mega millions'],
        category: 'Lottery'
    },
    'Auto': {
        keywords: ['motor oil', 'antifreeze', 'coolant', 'windshield', 'air freshener', 'car'],
        category: 'Auto'
    },
    'Pet': {
        keywords: ['dog food', 'cat food', 'pet', 'puppy', 'kitten'],
        category: 'Pet'
    }
}

// Auto-detect industry-standard category from product name
function standardizeCategory(productName: string, upcCategory?: string): string {
    if (!productName && !upcCategory) return 'General'

    const searchText = `${productName || ''} ${upcCategory || ''}`.toLowerCase()

    // Check each department's keywords
    for (const [dept, config] of Object.entries(STANDARD_DEPARTMENTS)) {
        for (const keyword of config.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return config.category
            }
        }
    }

    // If UPC category exists, try to map it
    if (upcCategory) {
        const lowerCat = upcCategory.toLowerCase()
        if (lowerCat.includes('beverage') || lowerCat.includes('drink')) return 'Beverages'
        if (lowerCat.includes('snack') || lowerCat.includes('chip')) return 'Snacks'
        if (lowerCat.includes('candy') || lowerCat.includes('confection')) return 'Candy'
        if (lowerCat.includes('tobacco') || lowerCat.includes('cigarette')) return 'Tobacco'
        if (lowerCat.includes('beer') || lowerCat.includes('wine') || lowerCat.includes('liquor')) return lowerCat.includes('beer') ? 'Beer' : lowerCat.includes('wine') ? 'Wine' : 'Spirits'
        if (lowerCat.includes('dairy') || lowerCat.includes('milk')) return 'Dairy'
        if (lowerCat.includes('frozen')) return 'Frozen'
        if (lowerCat.includes('health') || lowerCat.includes('beauty') || lowerCat.includes('personal')) return 'Health & Beauty'
    }

    return 'General'
}

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
                // No UPC or hit limit - auto-categorize from name
                const standardDept = standardizeCategory(item.originalName, undefined)
                enrichedItems.push({
                    ...item,
                    enrichedName: item.originalName,
                    brand: extractBrand(item.originalName),
                    size: extractSize(item.originalName),
                    category: standardDept, // Use standardized category
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
                // Found in master DB - use standardized category
                const standardDept = standardizeCategory(masterProduct.name || '', masterProduct.category || '')
                enrichedItems.push({
                    ...item,
                    enrichedName: masterProduct.name || item.originalName,
                    brand: masterProduct.brand || extractBrand(item.originalName),
                    size: masterProduct.size || extractSize(masterProduct.name || item.originalName),
                    category: standardDept, // Use standardized category
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
                const standardDept = standardizeCategory(upcData.title || '', upcData.category || '')

                try {
                    await prisma.masterUpcProduct.create({
                        data: {
                            upc: cleanUpc,
                            name: upcData.title || 'Unknown Product',
                            brand: upcData.brand || null,
                            description: upcData.description || null,
                            category: standardDept, // Save standardized category
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
                    category: standardDept, // Use standardized category
                    imageUrl: upcData.image,
                    needsEnrichment: false,
                    enrichmentSource: 'upc_database'
                })
            } else {
                // UPC not found anywhere - auto-categorize from name
                const standardDept = standardizeCategory(item.originalName, undefined)
                enrichedItems.push({
                    ...item,
                    enrichedName: item.originalName,
                    brand: extractBrand(item.originalName),
                    size: extractSize(item.originalName),
                    category: standardDept, // Use standardized category
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

